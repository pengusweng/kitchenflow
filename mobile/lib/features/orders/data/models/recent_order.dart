import 'package:flutter/foundation.dart';

/// Active tab on the Recent Orders screen: Open or Closed.
/// The Voided tab has been removed per specifications.
enum RecentOrderTab {
  open('Open'),
  closed('Closed');

  const RecentOrderTab(this.label);
  final String label;
}

/// Sorting options for recent orders.
enum RecentOrderSort {
  mostRecent('Most Recent'),
  oldest('Oldest'),
  highestTotal('Highest Total');

  const RecentOrderSort(this.label);
  final String label;
}

/// A line item inside a recent order, including modifiers and special instructions.
@immutable
class RecentOrderItem {
  const RecentOrderItem({
    required this.name,
    required this.quantity,
    required this.unitPriceCentavos,
    this.modifiers = const [],
    this.notes = const [],
  });

  final String name;
  final int quantity;
  final int unitPriceCentavos;
  final List<String> modifiers;
  final List<String> notes;

  int get totalCentavos => unitPriceCentavos * quantity;

  RecentOrderItem copyWith({
    String? name,
    int? quantity,
    int? unitPriceCentavos,
    List<String>? modifiers,
    List<String>? notes,
  }) {
    return RecentOrderItem(
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      unitPriceCentavos: unitPriceCentavos ?? this.unitPriceCentavos,
      modifiers: modifiers ?? this.modifiers,
      notes: notes ?? this.notes,
    );
  }
}

/// A recent order record displayed in the master-detail Recent Orders layout.
@immutable
class RecentOrder {
  const RecentOrder({
    required this.id,
    required this.orderCode,
    required this.ticketNumber,
    required this.channel,
    required this.tableOrPickup,
    required this.tab,
    required this.statusLabel,
    this.isReopened = false,
    required this.totalCentavos,
    required this.subtotalCentavos,
    required this.taxCentavos,
    this.amountDueCentavos = 0,
    this.paymentStatus = 'PAID',
    this.paymentMethod = 'Cash',
    required this.serverName,
    required this.lastModified,
    required this.createdAt,
    required this.items,
  });

  final String id;
  final String orderCode;
  final String ticketNumber;
  final String channel;
  final String tableOrPickup;
  final RecentOrderTab tab;
  final String statusLabel;
  final bool isReopened;
  final int totalCentavos;
  final int subtotalCentavos;
  final int taxCentavos;
  final int amountDueCentavos;
  final String paymentStatus;
  final String paymentMethod;
  final String serverName;
  final String lastModified;
  final DateTime createdAt;
  final List<RecentOrderItem> items;

  bool get isOpen => tab == RecentOrderTab.open;
  bool get isClosed => tab == RecentOrderTab.closed;

  RecentOrder copyWith({
    String? id,
    String? orderCode,
    String? ticketNumber,
    String? channel,
    String? tableOrPickup,
    RecentOrderTab? tab,
    String? statusLabel,
    bool? isReopened,
    int? totalCentavos,
    int? subtotalCentavos,
    int? taxCentavos,
    int? amountDueCentavos,
    String? paymentStatus,
    String? paymentMethod,
    String? serverName,
    String? lastModified,
    DateTime? createdAt,
    List<RecentOrderItem>? items,
  }) {
    return RecentOrder(
      id: id ?? this.id,
      orderCode: orderCode ?? this.orderCode,
      ticketNumber: ticketNumber ?? this.ticketNumber,
      channel: channel ?? this.channel,
      tableOrPickup: tableOrPickup ?? this.tableOrPickup,
      tab: tab ?? this.tab,
      statusLabel: statusLabel ?? this.statusLabel,
      isReopened: isReopened ?? this.isReopened,
      totalCentavos: totalCentavos ?? this.totalCentavos,
      subtotalCentavos: subtotalCentavos ?? this.subtotalCentavos,
      taxCentavos: taxCentavos ?? this.taxCentavos,
      amountDueCentavos: amountDueCentavos ?? this.amountDueCentavos,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      serverName: serverName ?? this.serverName,
      lastModified: lastModified ?? this.lastModified,
      createdAt: createdAt ?? this.createdAt,
      items: items ?? this.items,
    );
  }
}
