import 'package:flutter/foundation.dart';

/// Active tab on the Recent Orders screen: Open or Closed.
/// The Open tab is default and first.
enum RecentOrderTab {
  open('Open'),
  closed('Closed');

  const RecentOrderTab(this.label);
  final String label;
}

/// Parses a decimal currency value (String or num, in pesos) into integer centavos.
int parsePesoToCentavos(Object? raw) {
  if (raw == null) return 0;
  if (raw is int) return raw * 100;
  if (raw is double) return (raw * 100).round();
  if (raw is String) {
    final parsed = double.tryParse(raw.trim());
    if (parsed != null) return (parsed * 100).round();
  }
  return 0;
}

/// Maps backend `OrderChannel` enum values to POS display labels.
String formatOrderChannel(String? rawChannel) {
  return switch (rawChannel?.trim().toUpperCase()) {
    'DINE_IN' || 'DINE-IN' || 'DINEIN' || 'DINE IN' => 'Dine In',
    'TAKEAWAY' || 'TAKE_AWAY' || 'TAKE AWAY' => 'Takeaway',
    'GRABFOOD' || 'GRAB_FOOD' || 'GRAB FOOD' => 'GrabFood',
    'FOODPANDA' || 'FOOD_PANDA' || 'FOOD PANDA' => 'foodpanda',
    _ =>
      (rawChannel != null && rawChannel.trim().isNotEmpty)
          ? rawChannel.trim()
          : 'Takeaway',
  };
}

/// Maps POS channel filter labels to backend `OrderChannel` enum values.
String? toApiOrderChannel(String? channelLabel) {
  return switch (channelLabel?.trim().toLowerCase()) {
    'dine in' || 'dine-in' || 'dine_in' => 'DINE_IN',
    'takeaway' => 'TAKEAWAY',
    'grabfood' => 'GRABFOOD',
    'foodpanda' => 'FOODPANDA',
    _ => null,
  };
}

/// Determines which tab an order belongs to from backend `status`,
/// optional kitchen ticket `status`, and `payment_status`.
RecentOrderTab resolveOrderTab({
  required String orderStatus,
  required String paymentStatus,
  String? ticketStatus,
}) {
  final normalizedOrder = orderStatus.trim().toUpperCase();
  final normalizedTicket = ticketStatus?.trim().toUpperCase();

  if (normalizedOrder == 'COMPLETED' ||
      normalizedOrder == 'CANCELLED' ||
      normalizedTicket == 'HANDED_OVER' ||
      normalizedTicket == 'CANCELLED') {
    return RecentOrderTab.closed;
  }

  return RecentOrderTab.open;
}

/// Builds a human-readable status label from backend order and kitchen ticket statuses.
String buildOrderStatusLabel({
  required String orderStatus,
  String? ticketStatus,
}) {
  final normalizedOrder = orderStatus.trim().toUpperCase();
  final normalizedTicket = ticketStatus?.trim().toUpperCase();

  if (normalizedOrder == 'CANCELLED' || normalizedTicket == 'CANCELLED') {
    return 'Cancelled';
  }
  if (normalizedOrder == 'COMPLETED' || normalizedTicket == 'HANDED_OVER') {
    return 'Completed';
  }
  if (normalizedTicket == 'READY') {
    return 'Ready for handover';
  }
  if (normalizedTicket == 'FOR_CHECKING' || normalizedTicket == 'CHECKING') {
    return 'Quality check';
  }
  if (normalizedTicket == 'REWORKING') {
    return 'Reworking in kitchen';
  }
  if (normalizedOrder == 'PREPARING' || normalizedTicket == 'PREPARING') {
    return 'Preparing in kitchen';
  }
  if (normalizedTicket == 'ACKNOWLEDGED') {
    return 'Acknowledged by kitchen';
  }
  if (normalizedOrder == 'CONFIRMED' || normalizedTicket == 'QUEUED') {
    return 'Confirmed';
  }
  if (normalizedOrder == 'DRAFT') {
    return 'Draft';
  }
  return orderStatus;
}

/// Builds the subtitle reference (`table_reference`, `external_order_reference`, or channel fallback).
String buildTableOrPickup({
  required String channelLabel,
  String? tableReference,
  String? externalOrderReference,
}) {
  final table = tableReference?.trim() ?? '';
  if (table.isNotEmpty) {
    return table.toLowerCase().startsWith('table') ? table : 'Table $table';
  }
  final external = externalOrderReference?.trim() ?? '';
  if (external.isNotEmpty) {
    return external.toLowerCase().startsWith('order')
        ? external
        : 'Order #$external';
  }
  if (channelLabel.toLowerCase() == 'takeaway') {
    return 'Pick Up';
  }
  return channelLabel;
}

/// A line item inside a recent order, mapped from backend `OrderItemResponseDTO`.
@immutable
class RecentOrderItem {
  const RecentOrderItem({
    this.id,
    this.menuItemId,
    required this.name,
    required this.quantity,
    required this.unitPriceCentavos,
    this.modifierPriceCentavos = 0,
    this.modifiers = const [],
    this.notes = const [],
  });

  factory RecentOrderItem.fromApiJson(Map<String, dynamic> json) {
    final rawModifiers =
        json['order_item_modifiers_order_item'] ?? json['modifiers'];
    final modifierNames = <String>[];
    var modifierCentavos = 0;

    if (rawModifiers is List) {
      for (final entry in rawModifiers) {
        if (entry is Map) {
          final modName = (entry['modifier_name'] ?? entry['name'])
              ?.toString()
              .trim();
          final addPrice = parsePesoToCentavos(
            entry['additional_price'] ?? entry['price'],
          );
          modifierCentavos += addPrice;
          if (modName != null && modName.isNotEmpty) {
            modifierNames.add(modName);
          }
        } else if (entry is String && entry.trim().isNotEmpty) {
          modifierNames.add(entry.trim());
        }
      }
    }

    final rawNotes = json['notes'];
    final parsedNotes = <String>[];
    if (rawNotes is String && rawNotes.trim().isNotEmpty) {
      parsedNotes.add(rawNotes.trim());
    } else if (rawNotes is List) {
      for (final n in rawNotes) {
        if (n != null && n.toString().trim().isNotEmpty) {
          parsedNotes.add(n.toString().trim());
        }
      }
    }

    return RecentOrderItem(
      id: json['order_item_id']?.toString(),
      menuItemId: json['menu_item_id']?.toString(),
      name: (json['item_name'] ?? json['name'])?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPriceCentavos: parsePesoToCentavos(json['unit_price']),
      modifierPriceCentavos: modifierCentavos,
      modifiers: modifierNames,
      notes: parsedNotes,
    );
  }

  final String? id;
  final String? menuItemId;
  final String name;
  final int quantity;
  final int unitPriceCentavos;
  final int modifierPriceCentavos;
  final List<String> modifiers;
  final List<String> notes;

  int get totalCentavos =>
      (unitPriceCentavos + modifierPriceCentavos) * quantity;

  RecentOrderItem copyWith({
    String? id,
    String? menuItemId,
    String? name,
    int? quantity,
    int? unitPriceCentavos,
    int? modifierPriceCentavos,
    List<String>? modifiers,
    List<String>? notes,
  }) {
    return RecentOrderItem(
      id: id ?? this.id,
      menuItemId: menuItemId ?? this.menuItemId,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      unitPriceCentavos: unitPriceCentavos ?? this.unitPriceCentavos,
      modifierPriceCentavos:
          modifierPriceCentavos ?? this.modifierPriceCentavos,
      modifiers: modifiers ?? this.modifiers,
      notes: notes ?? this.notes,
    );
  }
}

/// A recent order record mapped from backend `OrderResponseDTO` / `OrderSummaryResponseDTO`.
@immutable
class RecentOrder {
  const RecentOrder({
    required this.id,
    this.brandId = '',
    this.brandName,
    required this.orderCode,
    required this.ticketNumber,
    required this.channel,
    required this.tableOrPickup,
    required this.tab,
    this.orderStatus = 'CONFIRMED',
    required this.statusLabel,
    required this.totalCentavos,
    this.paymentStatus = 'UNPAID',
    this.notes,
    this.cancellationReason,
    required this.createdAt,
    required this.items,
    this.hasLoadedDetails = true,
  });

  factory RecentOrder.fromApiJson(Map<String, dynamic> json) {
    final id = json['order_id']?.toString() ?? '';
    final orderCode = json['order_code']?.toString() ?? '';
    final brandMap = json['brand'];
    final brandId =
        json['brand_id']?.toString() ??
        (brandMap is Map ? brandMap['brand_id']?.toString() : null) ??
        '';
    final brandName = brandMap is Map ? brandMap['name']?.toString() : null;

    final rawChannel =
        json['order_channel']?.toString() ??
        json['channel']?.toString() ??
        json['orderChannel']?.toString();
    final channelLabel = formatOrderChannel(rawChannel);
    final tableOrPickup = buildTableOrPickup(
      channelLabel: channelLabel,
      tableReference: json['table_reference']?.toString(),
      externalOrderReference: json['external_order_reference']?.toString(),
    );

    final orderStatus = json['status']?.toString() ?? 'CONFIRMED';
    final paymentStatus = json['payment_status']?.toString() ?? 'UNPAID';

    final ticketMap = json['kitchen_tickets_order'];
    final String? ticketStatus = ticketMap is Map
        ? ticketMap['status']?.toString()
        : null;
    final String? rawTicketNumber = ticketMap is Map
        ? ticketMap['ticket_number']?.toString()
        : null;
    final ticketNumber =
        (rawTicketNumber != null && rawTicketNumber.trim().isNotEmpty)
        ? rawTicketNumber.trim()
        : (orderCode.startsWith('#') ? orderCode : '#$orderCode');

    final tab = resolveOrderTab(
      orderStatus: orderStatus,
      paymentStatus: paymentStatus,
      ticketStatus: ticketStatus,
    );
    final statusLabel = buildOrderStatusLabel(
      orderStatus: orderStatus,
      ticketStatus: ticketStatus,
    );

    final hasItemsKey =
        json.containsKey('order_items_order') || json.containsKey('lines');
    final rawItems = json['order_items_order'] ?? json['lines'];
    final parsedItems = <RecentOrderItem>[];
    if (rawItems is List) {
      for (final rawItem in rawItems) {
        if (rawItem is Map<String, dynamic>) {
          parsedItems.add(RecentOrderItem.fromApiJson(rawItem));
        } else if (rawItem is Map) {
          parsedItems.add(
            RecentOrderItem.fromApiJson(Map<String, dynamic>.from(rawItem)),
          );
        }
      }
    }

    final computedTotal = parsedItems.fold<int>(
      0,
      (sum, item) => sum + item.totalCentavos,
    );

    final createdAtRaw =
        json['created_at']?.toString() ?? json['order_date']?.toString();
    final createdAt =
        (createdAtRaw != null ? DateTime.tryParse(createdAtRaw) : null) ??
        DateTime.now();

    final rawNotes = json['notes']?.toString().trim();
    final rawCancelReason = json['cancellation_reason']?.toString().trim();

    return RecentOrder(
      id: id,
      brandId: brandId,
      brandName: brandName,
      orderCode: orderCode,
      ticketNumber: ticketNumber,
      channel: channelLabel,
      tableOrPickup: tableOrPickup,
      tab: tab,
      orderStatus: orderStatus,
      statusLabel: statusLabel,
      totalCentavos: computedTotal,
      paymentStatus: paymentStatus,
      notes: (rawNotes != null && rawNotes.isNotEmpty) ? rawNotes : null,
      cancellationReason:
          (rawCancelReason != null && rawCancelReason.isNotEmpty)
          ? rawCancelReason
          : null,
      createdAt: createdAt,
      items: parsedItems,
      hasLoadedDetails: hasItemsKey,
    );
  }

  final String id;
  final String brandId;
  final String? brandName;
  final String orderCode;
  final String ticketNumber;
  final String channel;
  final String tableOrPickup;
  final RecentOrderTab tab;
  final String orderStatus;
  final String statusLabel;
  final int totalCentavos;
  final String paymentStatus;
  final String? notes;
  final String? cancellationReason;
  final DateTime createdAt;
  final List<RecentOrderItem> items;
  final bool hasLoadedDetails;

  bool get isOpen => tab == RecentOrderTab.open;
  bool get isPaid => paymentStatus.trim().toUpperCase() == 'PAID';
  bool get isUnpaid => paymentStatus.trim().toUpperCase() != 'PAID';
  bool get isClosed => tab == RecentOrderTab.closed;
  bool get isDraft =>
      orderStatus.trim().toUpperCase() == 'DRAFT' ||
      statusLabel.trim().toUpperCase() == 'DRAFT';

  RecentOrder copyWith({
    String? id,
    String? brandId,
    String? brandName,
    String? orderCode,
    String? ticketNumber,
    String? channel,
    String? tableOrPickup,
    RecentOrderTab? tab,
    String? orderStatus,
    String? statusLabel,
    int? totalCentavos,
    String? paymentStatus,
    String? notes,
    String? cancellationReason,
    DateTime? createdAt,
    List<RecentOrderItem>? items,
    bool? hasLoadedDetails,
  }) {
    return RecentOrder(
      id: id ?? this.id,
      brandId: brandId ?? this.brandId,
      brandName: brandName ?? this.brandName,
      orderCode: orderCode ?? this.orderCode,
      ticketNumber: ticketNumber ?? this.ticketNumber,
      channel: channel ?? this.channel,
      tableOrPickup: tableOrPickup ?? this.tableOrPickup,
      tab: tab ?? this.tab,
      orderStatus: orderStatus ?? this.orderStatus,
      statusLabel: statusLabel ?? this.statusLabel,
      totalCentavos: totalCentavos ?? this.totalCentavos,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      notes: notes ?? this.notes,
      cancellationReason: cancellationReason ?? this.cancellationReason,
      createdAt: createdAt ?? this.createdAt,
      items: items ?? this.items,
      hasLoadedDetails: hasLoadedDetails ?? this.hasLoadedDetails,
    );
  }
}
