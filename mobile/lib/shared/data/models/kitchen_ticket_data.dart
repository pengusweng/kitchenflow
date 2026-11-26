import 'package:flutter/foundation.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart'; // verify path

enum KitchenTicketAge { onTime, dueSoon, late }

@immutable
class KitchenTicketItem {
  const KitchenTicketItem({
    required this.quantity,
    required this.name,
    this.modifiers = const [],
    this.orderItemId,
    this.failReason,
    this.menuItemId,
    this.brand,
  });

  final int quantity;
  final String name;
  final List<String> modifiers; // e.g. "EXTRA rice", "NO onions"
  final String? orderItemId;
  final String? failReason;
  final String? menuItemId;
  final AssignedBrand? brand;

  KitchenTicketItem copyWith({
    int? quantity,
    String? name,
    List<String>? modifiers,
    String? orderItemId,
    String? failReason,
    bool clearFailReason = false,
    String? menuItemId,
    AssignedBrand? brand,
  }) {
    return KitchenTicketItem(
      quantity: quantity ?? this.quantity,
      name: name ?? this.name,
      modifiers: modifiers ?? this.modifiers,
      orderItemId: orderItemId ?? this.orderItemId,
      failReason: clearFailReason ? null : (failReason ?? this.failReason),
      menuItemId: menuItemId ?? this.menuItemId,
      brand: brand ?? this.brand,
    );
  }
}

/// Represents a partition of ticket items grouped under a single brand.
@immutable
class BrandTicketItemGroup {
  const BrandTicketItemGroup({required this.brand, required this.items});

  final AssignedBrand brand;
  final List<KitchenTicketItem> items;
}

@immutable
class KitchenTicketData {
  const KitchenTicketData({
    required this.ticketNumber,
    required this.elapsed,
    required this.age,
    required this.status,
    required this.channel,
    required this.reference,
    required this.brand,
    this.brands,
    required this.items,
    this.paymentStatus = 'Paid',
    this.qcReturnedReason,
    this.createdAt,
  });

  final String ticketNumber; // "T-014"
  final Duration elapsed;
  final KitchenTicketAge age;
  final KkfcStatus status;
  final String channel; // "GrabFood"
  final String reference; // "#GF-1001"
  final AssignedBrand brand; // brand.code -> tag, brand.name -> label
  final List<AssignedBrand>? brands;
  final List<KitchenTicketItem> items;
  final String paymentStatus;
  final String? qcReturnedReason;
  final DateTime? createdAt;

  /// Returns all assigned brands for multi-brand orders, falling back to [brand].
  List<AssignedBrand> get effectiveBrands =>
      brands != null && brands!.isNotEmpty ? brands! : [brand];

  /// Whether this ticket contains items across multiple brands.
  bool get isMultiBrand => effectiveBrands.length > 1;

  /// Returns items grouped and partitioned by their brand.
  List<BrandTicketItemGroup> get brandItemGroups {
    final groups = <String, BrandTicketItemGroup>{};
    final orderedKeys = <String>[];

    for (final item in items) {
      final itemBrand = item.brand ?? _matchItemBrand(item) ?? brand;
      final key = itemBrand.code.toUpperCase();
      if (!groups.containsKey(key)) {
        orderedKeys.add(key);
        groups[key] = BrandTicketItemGroup(brand: itemBrand, items: [item]);
      } else {
        groups[key]!.items.add(item);
      }
    }

    if (groups.isEmpty) {
      return [BrandTicketItemGroup(brand: brand, items: items)];
    }

    return [for (final key in orderedKeys) groups[key]!];
  }

  AssignedBrand? _matchItemBrand(KitchenTicketItem item) {
    if (item.brand != null) return item.brand;
    final lower = item.name.toLowerCase().trim();
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

    for (final b in effectiveBrands) {
      if (b.code.toUpperCase() == matchedCode) {
        return b;
      }
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

  /// Returns a copy of this ticket with items arranged contiguously by brand.
  KitchenTicketData withItemsArrangedByBrand() {
    final arrangedItems = <KitchenTicketItem>[];
    for (final group in brandItemGroups) {
      arrangedItems.addAll(group.items);
    }
    return copyWith(items: arrangedItems);
  }

  /// Whether this ticket is a delivery channel (e.g. GrabFood or foodpanda).
  bool get isDelivery {
    final clean = channel.replaceAll(RegExp(r'[\s_\-]'), '').toLowerCase();
    return clean == 'grabfood' || clean == 'foodpanda';
  }

  KitchenTicketData copyWith({
    String? ticketNumber,
    Duration? elapsed,
    KitchenTicketAge? age,
    KkfcStatus? status,
    String? channel,
    String? reference,
    AssignedBrand? brand,
    List<AssignedBrand>? brands,
    List<KitchenTicketItem>? items,
    String? paymentStatus,
    String? qcReturnedReason,
    DateTime? createdAt,
  }) {
    final newBrands = brands ?? this.brands;
    final newBrand =
        brand ??
        (brands != null && brands.isNotEmpty ? brands.first : this.brand);
    return KitchenTicketData(
      ticketNumber: ticketNumber ?? this.ticketNumber,
      elapsed: elapsed ?? this.elapsed,
      age: age ?? this.age,
      status: status ?? this.status,
      channel: channel ?? this.channel,
      reference: reference ?? this.reference,
      brand: newBrand,
      brands: newBrands,
      items: items ?? this.items,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      qcReturnedReason: qcReturnedReason ?? this.qcReturnedReason,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
