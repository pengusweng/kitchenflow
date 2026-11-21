import 'dart:async';

import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';

class KitchenBoardEnricher {
  const KitchenBoardEnricher._();

  static List<KitchenBoardTicket> preserveEnrichedDetails(
    List<KitchenBoardTicket> tickets,
    Map<String, KitchenBoardTicket> prevMap,
  ) {
    return tickets.map((t) {
      final prev = prevMap[t.kitchenTicketId];
      if (prev != null &&
          prev.data.channel.isNotEmpty &&
          prev.data.channel != 'Takeaway' &&
          t.data.channel == 'Takeaway') {
        return t.withChannel(
          prev.data.channel,
          reference:
              prev.data.reference.isNotEmpty &&
                  prev.data.reference != t.orderCode
              ? prev.data.reference
              : null,
        );
      }
      return t;
    }).toList();
  }

  static Future<List<KitchenBoardTicket>> enrichTicketsWithOrders({
    required KitchenBoardRepository repo,
    required List<KitchenBoardTicket> tickets,
    required Map<String, KitchenBoardTicket> prevMap,
    required bool Function() isMounted,
    required Future<List<AssignedBrand>> Function() getBrands,
  }) async {
    final preserved = preserveEnrichedDetails(tickets, prevMap);

    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    List<AssignedBrand>? cachedBrands;

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
        if (t.orderId.isEmpty) return t;

        // Skip if ticket already has a resolved non-placeholder channel or reference
        final isPlaceholder =
            t.data.channel == 'Takeaway' &&
            (t.data.reference.isEmpty || t.data.reference == t.orderCode);
        if (!isPlaceholder) return t;

        try {
          if (!isMounted()) return t;
          final brandId = await resolveTicketBrandId(t);
          if (brandId == null || !isMounted()) return t;
          final orderData = await repo
              .fetchOrder(brandId: brandId, orderId: t.orderId)
              .timeout(const Duration(milliseconds: 300));
          if (orderData != null) {
            return t.applyOrder(orderData);
          }
        } catch (_) {
          // If order fetch fails, keep ticket as is
        }
        return t;
      }),
    );
  }
}
