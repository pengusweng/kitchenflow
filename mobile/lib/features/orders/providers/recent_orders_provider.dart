import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';
import 'package:mobile/features/orders/data/seed/sample_recent_orders.dart';

@immutable
class RecentOrdersState {
  const RecentOrdersState({
    required this.orders,
    this.selectedTab = RecentOrderTab.closed,
    this.searchQuery = '',
    this.channelFilter = 'All',
    this.sortOption = RecentOrderSort.mostRecent,
    this.selectedOrderId,
  });

  final List<RecentOrder> orders;
  final RecentOrderTab selectedTab;
  final String searchQuery;
  final String channelFilter;
  final RecentOrderSort sortOption;
  final String? selectedOrderId;

  List<RecentOrder> get filteredOrders {
    var result = orders.where((order) {
      // 1. Tab filter (Open or Closed)
      if (order.tab != selectedTab) return false;

      // 2. Channel filter
      if (channelFilter != 'All' &&
          order.channel.toLowerCase() != channelFilter.toLowerCase()) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.isNotEmpty) {
        final query = searchQuery.toLowerCase().trim();
        final matchesCode = order.orderCode.toLowerCase().contains(query);
        final matchesTicket = order.ticketNumber.toLowerCase().contains(query);
        final matchesChannel = order.channel.toLowerCase().contains(query);
        final matchesServer = order.serverName.toLowerCase().contains(query);
        final matchesItems = order.items.any(
          (item) => item.name.toLowerCase().contains(query),
        );
        if (!matchesCode &&
            !matchesTicket &&
            !matchesChannel &&
            !matchesServer &&
            !matchesItems) {
          return false;
        }
      }

      return true;
    }).toList();

    // Sorting
    switch (sortOption) {
      case RecentOrderSort.mostRecent:
        result.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        break;
      case RecentOrderSort.oldest:
        result.sort((a, b) => a.createdAt.compareTo(b.createdAt));
        break;
      case RecentOrderSort.highestTotal:
        result.sort((a, b) => b.totalCentavos.compareTo(a.totalCentavos));
        break;
    }

    return result;
  }

  RecentOrder? get selectedOrder {
    final list = filteredOrders;
    if (list.isEmpty) return null;
    if (selectedOrderId == null) return list.first;

    final found = list.where((o) => o.id == selectedOrderId).firstOrNull;
    return found ?? list.first;
  }

  int countForTab(RecentOrderTab tab) =>
      orders.where((o) => o.tab == tab).length;

  RecentOrdersState copyWith({
    List<RecentOrder>? orders,
    RecentOrderTab? selectedTab,
    String? searchQuery,
    String? channelFilter,
    RecentOrderSort? sortOption,
    String? selectedOrderId,
    bool clearSelectedOrderId = false,
  }) {
    return RecentOrdersState(
      orders: orders ?? this.orders,
      selectedTab: selectedTab ?? this.selectedTab,
      searchQuery: searchQuery ?? this.searchQuery,
      channelFilter: channelFilter ?? this.channelFilter,
      sortOption: sortOption ?? this.sortOption,
      selectedOrderId: clearSelectedOrderId
          ? null
          : (selectedOrderId ?? this.selectedOrderId),
    );
  }
}

class RecentOrdersNotifier extends Notifier<RecentOrdersState> {
  @override
  RecentOrdersState build() {
    return RecentOrdersState(
      orders: createSampleRecentOrders(),
      selectedTab: RecentOrderTab.closed,
      selectedOrderId: 'ord-1001-16329',
    );
  }

  void setTab(RecentOrderTab tab) {
    if (state.selectedTab == tab) return;
    state = state.copyWith(selectedTab: tab, clearSelectedOrderId: true);
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setChannelFilter(String channel) {
    state = state.copyWith(channelFilter: channel);
  }

  void setSortOption(RecentOrderSort sort) {
    state = state.copyWith(sortOption: sort);
  }

  void selectOrder(String orderId) {
    state = state.copyWith(selectedOrderId: orderId);
  }

  void reopenOrder(String orderId) {
    final updated = state.orders.map((o) {
      if (o.id == orderId) {
        return o.copyWith(
          tab: RecentOrderTab.open,
          isReopened: true,
          statusLabel: 'Reopened • Preparing in kitchen',
          lastModified: 'Just now',
        );
      }
      return o;
    }).toList();

    state = state.copyWith(
      orders: updated,
      selectedTab: RecentOrderTab.open,
      selectedOrderId: orderId,
    );
  }
}

final recentOrdersProvider =
    NotifierProvider<RecentOrdersNotifier, RecentOrdersState>(
      RecentOrdersNotifier.new,
    );
