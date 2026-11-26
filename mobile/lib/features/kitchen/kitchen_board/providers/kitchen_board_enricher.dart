import 'dart:async';

import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/shared/data/models/kitchen_ticket_data.dart';

class KitchenBoardEnricher {
  const KitchenBoardEnricher._();

  static Map<String, AssignedBrand>? _cachedCatalog;
  static DateTime? _catalogCacheTime;

  /// Clears in-memory catalog cache (useful for testing or session reset).
  static void clearCatalogCache() {
    _cachedCatalog = null;
    _catalogCacheTime = null;
  }

  static List<KitchenBoardTicket> preserveEnrichedDetails(
    List<KitchenBoardTicket> tickets,
    Map<String, KitchenBoardTicket> prevMap,
  ) {
    return tickets.map((t) {
      var current = t;
      final prev = prevMap[t.kitchenTicketId];
      if (prev != null) {
        if (prev.data.channel.isNotEmpty &&
            prev.data.channel != 'Takeaway' &&
            current.data.channel == 'Takeaway') {
          current = current.withChannel(
            prev.data.channel,
            reference:
                prev.data.reference.isNotEmpty &&
                    prev.data.reference != current.orderCode
                ? prev.data.reference
                : null,
          );
        }
        if (current.qcReturnedReason == null && prev.qcReturnedReason != null) {
          current = current.copyWith(qcReturnedReason: prev.qcReturnedReason);
        }
        if (current.qcAttempts.isEmpty && prev.qcAttempts.isNotEmpty) {
          current = current.applyQcAttempts(prev.qcAttempts);
        }

        // Preserve multi-brand and item-level brand assignments
        final shouldPreserveMultiBrand =
            prev.data.effectiveBrands.length > 1 ||
            prev.data.items.any((i) => i.brand != null);

        if (shouldPreserveMultiBrand) {
          final isCurrentPlaceholder =
              current.data.items.isEmpty ||
              (current.data.items.length == 1 &&
                  (current.data.items.first.name.startsWith('Order ') ||
                      current.data.items.first.name == 'Kitchen Order'));

          final List<KitchenTicketItem> preservedItems;
          if (isCurrentPlaceholder && prev.data.items.isNotEmpty) {
            preservedItems = prev.data.items;
          } else {
            preservedItems = [
              for (var i = 0; i < current.data.items.length; i++)
                (() {
                  final currItem = current.data.items[i];
                  AssignedBrand? itemBrand = currItem.brand;
                  if (itemBrand == null) {
                    // 1. Try matching with prev items by orderItemId
                    if (currItem.orderItemId != null &&
                        currItem.orderItemId!.isNotEmpty) {
                      for (final p in prev.data.items) {
                        if (p.orderItemId == currItem.orderItemId &&
                            p.brand != null) {
                          itemBrand = p.brand;
                          break;
                        }
                      }
                    }
                    // 2. Try matching with prev items by menuItemId
                    if (itemBrand == null &&
                        currItem.menuItemId != null &&
                        currItem.menuItemId!.isNotEmpty) {
                      for (final p in prev.data.items) {
                        if (p.menuItemId == currItem.menuItemId &&
                            p.brand != null) {
                          itemBrand = p.brand;
                          break;
                        }
                      }
                    }
                    // 3. Try matching with prev items by name
                    if (itemBrand == null) {
                      final lowerName = currItem.name.trim().toLowerCase();
                      for (final p in prev.data.items) {
                        if (p.name.trim().toLowerCase() == lowerName &&
                            p.brand != null) {
                          itemBrand = p.brand;
                          break;
                        }
                      }
                    }
                    // 4. Try matching with prev items at same index if names match
                    if (itemBrand == null &&
                        i < prev.data.items.length &&
                        prev.data.items[i].brand != null &&
                        prev.data.items[i].name.trim().toLowerCase() ==
                            currItem.name.trim().toLowerCase()) {
                      itemBrand = prev.data.items[i].brand;
                    }
                    // 5. Try matching from static catalog cache
                    if (itemBrand == null && _cachedCatalog != null) {
                      if (currItem.menuItemId != null) {
                        itemBrand = _cachedCatalog![currItem.menuItemId];
                      }
                      itemBrand ??=
                          _cachedCatalog![currItem.name.trim().toLowerCase()];
                    }
                    // 6. Try keyword matcher
                    itemBrand ??= _matchBrandFromItemName(
                      currItem.name,
                      prev.data.effectiveBrands,
                    );
                  }
                  return currItem.copyWith(brand: itemBrand);
                })(),
            ];
          }

          final resolvedBrands = _resolveBrandsForTicket(
            current.copyWith(
              data: current.data.copyWith(items: preservedItems),
            ),
            catalogMap: _cachedCatalog,
            availableBrands: prev.data.effectiveBrands,
          );

          final effectiveBrands = resolvedBrands.length > 1
              ? resolvedBrands
              : prev.data.effectiveBrands;

          current = current.copyWith(
            data: current.data
                .copyWith(
                  items: preservedItems,
                  brands: effectiveBrands,
                  brand: prev.data.brand,
                )
                .withItemsArrangedByBrand(),
          );
        }
      }
      return current;
    }).toList();
  }

  static Future<List<KitchenBoardTicket>> enrichTicketsWithOrders({
    required KitchenBoardRepository repo,
    required List<KitchenBoardTicket> tickets,
    required Map<String, KitchenBoardTicket> prevMap,
    required bool Function() isMounted,
    required Future<List<AssignedBrand>> Function() getBrands,
    Future<List<MenuItem>> Function(String brandId)? getMenuItems,
  }) async {
    final preserved = preserveEnrichedDetails(tickets, prevMap);

    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    List<AssignedBrand>? cachedBrands;

    // Load or refresh catalog cache
    Map<String, AssignedBrand>? catalogMap = _cachedCatalog;
    final now = DateTime.now();
    final isCatalogStale =
        _cachedCatalog == null ||
        _catalogCacheTime == null ||
        now.difference(_catalogCacheTime!) > const Duration(minutes: 5);

    if (isCatalogStale && getMenuItems != null && isMounted()) {
      try {
        final brands =
            cachedBrands ??
            await getBrands().timeout(const Duration(milliseconds: 300));
        cachedBrands = brands;
        final newCatalog = <String, AssignedBrand>{};
        for (final brand in brands) {
          if (!isMounted()) break;
          try {
            final items = await getMenuItems(brand.id)
                .timeout(const Duration(milliseconds: 500));
            for (final item in items) {
              newCatalog[item.id] = brand;
              newCatalog[item.name.trim().toLowerCase()] = brand;
            }
          } catch (_) {
            // Ignore single brand fetch failure
          }
        }
        if (newCatalog.isNotEmpty) {
          _cachedCatalog = newCatalog;
          _catalogCacheTime = now;
          catalogMap = newCatalog;
        }
      } catch (_) {
        // Fallback gracefully
      }
    }

    Future<String?> resolveTicketBrandId(KitchenBoardTicket t) async {
      final directId = t.data.brand.id;
      if (uuidRegex.hasMatch(directId)) return directId;

      try {
        if (!isMounted()) return null;
        cachedBrands ??= await getBrands().timeout(
          const Duration(milliseconds: 300),
        );
        final code = t.data.brand.code.toUpperCase();
        final match = cachedBrands!.firstWhere(
          (b) => b.code.toUpperCase() == code,
          orElse: () => cachedBrands!.firstWhere(
            (b) => b.name.toLowerCase() == t.data.brand.name.toLowerCase(),
            orElse: () => cachedBrands!.first,
          ),
        );
        if (uuidRegex.hasMatch(match.id)) return match.id;
      } catch (_) {
        // Fallback
      }
      return null;
    }

    return Future.wait(
      preserved.map((t) async {
        var current = t;

        final isQcOrRework =
            current.rawStatus.toUpperCase() == 'REWORKING' ||
            current.rawStatus.toUpperCase() == 'FOR_CHECKING' ||
            current.rawStatus.toUpperCase() == 'CHECKING' ||
            current.qcFailureCount > 0;
        final needsQcHistory =
            isQcOrRework &&
            (current.qcAttempts.isEmpty ||
                current.pastQcAttempts.length < current.qcFailureCount);

        if (needsQcHistory && isMounted()) {
          try {
            final attempts = await repo
                .fetchTicketQcAttempts(current.kitchenTicketId)
                .timeout(const Duration(milliseconds: 300));
            if (attempts.isNotEmpty) {
              current = current.applyQcAttempts(attempts);
            }
          } catch (_) {
            // Keep ticket as is if QC attempts fetch fails
          }
        }

        // Multi-brand and item-brand resolution: resolve items against catalog
        if (current.data.items.isNotEmpty) {
          final updatedItems = current.data.items.map((item) {
            AssignedBrand? catalogBrand;
            if (catalogMap != null) {
              if (item.menuItemId != null) {
                catalogBrand = catalogMap[item.menuItemId];
              }
              catalogBrand ??= catalogMap[item.name.trim().toLowerCase()];
            }
            final resolvedBrand =
                item.brand ??
                catalogBrand ??
                _matchBrandFromItemName(item.name, cachedBrands) ??
                current.data.brand;
            return item.copyWith(brand: resolvedBrand);
          }).toList();

          final resolvedBrands = _resolveBrandsForTicket(
            current.copyWith(data: current.data.copyWith(items: updatedItems)),
            catalogMap: catalogMap,
            availableBrands: cachedBrands,
          );

          current = current.copyWith(
            data: current.data
                .copyWith(
                  items: updatedItems,
                  brand: resolvedBrands.isNotEmpty
                      ? resolvedBrands.first
                      : current.data.brand,
                  brands: resolvedBrands.isNotEmpty
                      ? resolvedBrands
                      : current.data.effectiveBrands,
                )
                .withItemsArrangedByBrand(),
          );
        }

        if (current.orderId.isEmpty) return current;

        // Skip if ticket already has a resolved non-placeholder channel or reference
        final isPlaceholder =
            current.data.channel == 'Takeaway' &&
            (current.data.reference.isEmpty ||
                current.data.reference == current.orderCode);
        if (!isPlaceholder) return current;

        try {
          if (!isMounted()) return current;
          final brandId = await resolveTicketBrandId(current);
          if (brandId == null || !isMounted()) return current;
          final orderData = await repo
              .fetchOrder(brandId: brandId, orderId: current.orderId)
              .timeout(const Duration(milliseconds: 300));
          if (orderData != null) {
            return current.applyOrder(orderData);
          }
        } catch (_) {
          // If order fetch fails, keep ticket as is
        }
        return current;
      }),
    );
  }

  static List<AssignedBrand> _resolveBrandsForTicket(
    KitchenBoardTicket ticket, {
    Map<String, AssignedBrand>? catalogMap,
    List<AssignedBrand>? availableBrands,
  }) {
    final matched = <String, AssignedBrand>{};
    for (final item in ticket.data.items) {
      AssignedBrand? brand = item.brand;
      if (brand == null && item.menuItemId != null && catalogMap != null) {
        brand = catalogMap[item.menuItemId];
      }
      if (brand == null && catalogMap != null) {
        brand = catalogMap[item.name.trim().toLowerCase()];
      }
      brand ??= _matchBrandFromItemName(item.name, availableBrands);

      if (brand != null) {
        matched[brand.code.toUpperCase()] = brand;
      }
    }

    if (matched.length > 1) {
      return matched.values.toList(growable: false);
    }
    if (matched.length == 1) {
      return matched.values.toList(growable: false);
    }
    return ticket.data.effectiveBrands;
  }

  static AssignedBrand? _matchBrandFromItemName(
    String name,
    List<AssignedBrand>? availableBrands,
  ) {
    final lower = name.toLowerCase().trim();
    String? matchedCode;

    if (lower.contains('inasal') ||
        lower.contains('paa') ||
        lower.contains('pecho') ||
        lower.contains('halo-halo')) {
      matchedCode = 'AI';
    } else if (lower.contains('gamcheon') ||
        lower.contains('samgyupsal') ||
        lower.contains('bulgogi') ||
        lower.contains('kimchi') ||
        lower.contains('pancake')) {
      matchedCode = 'GC';
    } else if (lower.contains('king kung') ||
        lower.contains('latte') ||
        lower.contains('matcha') ||
        lower.contains('coffee') ||
        lower.contains('espresso') ||
        lower.contains('sea salt cream')) {
      matchedCode = 'KK';
    }

    if (matchedCode == null) return null;

    if (availableBrands != null && availableBrands.isNotEmpty) {
      final found = availableBrands.cast<AssignedBrand?>().firstWhere(
        (b) => b?.code.toUpperCase() == matchedCode,
        orElse: () => null,
      );
      if (found != null) return found;
    }

    return switch (matchedCode) {
      'KK' => const AssignedBrand(
        id: 'brand-kk',
        code: 'KK',
        name: 'King Kungs Kafé',
      ),
      'AI' => const AssignedBrand(
        id: 'brand-ai',
        code: 'AI',
        name: "Aurelia's Inasal",
      ),
      'GC' => const AssignedBrand(id: 'brand-gc', code: 'GC', name: 'Gamcheon'),
      _ => null,
    };
  }
}
