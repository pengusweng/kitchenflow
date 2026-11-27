import 'dart:async';

import 'package:dio/dio.dart' show CancelToken;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';
import 'package:mobile/features/orders/data/repositories/recent_orders_repository.dart';
import 'package:mobile/features/orders/data/seed/sample_recent_orders.dart';

@immutable
class RecentOrdersState {
  const RecentOrdersState({
    required this.orders,
    this.selectedTab = RecentOrderTab.open,
    this.searchQuery = '',
    this.channelFilter = 'All',
    this.selectedOrderId,
    this.isLoading = false,
    this.errorMessage,
  });

  final List<RecentOrder> orders;
  final RecentOrderTab selectedTab;
  final String searchQuery;
  final String channelFilter;
  final String? selectedOrderId;
  final bool isLoading;
  final String? errorMessage;

  List<RecentOrder> get filteredOrders {
    final result = orders.where((order) {
      // 1. Tab filter (Unpaid, Paid, or Closed)
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
        final matchesItems = order.items.any(
          (item) => item.name.toLowerCase().contains(query),
        );
        if (!matchesCode &&
            !matchesTicket &&
            !matchesChannel &&
            !matchesItems) {
          return false;
        }
      }

      return true;
    }).toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    return result;
  }

  RecentOrder? get selectedOrder {
    final filtered = filteredOrders;
    if (filtered.isEmpty) return null;

    if (selectedOrderId != null) {
      for (final o in filtered) {
        if (o.id == selectedOrderId) return o;
      }
    }
    return filtered.first;
  }

  int countForTab(RecentOrderTab tab) =>
      orders.where((o) => o.tab == tab).length;

  RecentOrdersState copyWith({
    List<RecentOrder>? orders,
    RecentOrderTab? selectedTab,
    String? searchQuery,
    String? channelFilter,
    String? selectedOrderId,
    bool clearSelectedOrderId = false,
    bool? isLoading,
    String? errorMessage,
    bool clearErrorMessage = false,
  }) {
    return RecentOrdersState(
      orders: orders ?? this.orders,
      selectedTab: selectedTab ?? this.selectedTab,
      searchQuery: searchQuery ?? this.searchQuery,
      channelFilter: channelFilter ?? this.channelFilter,
      selectedOrderId: clearSelectedOrderId
          ? null
          : (selectedOrderId ?? this.selectedOrderId),
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearErrorMessage
          ? null
          : (errorMessage ?? this.errorMessage),
    );
  }
}

class RecentOrdersNotifier extends Notifier<RecentOrdersState> {
  static final _uuidRegex = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  );

  CancelToken? _cancelToken;

  void _cancelPendingRequest() {
    final token = _cancelToken;
    _cancelToken = null;
    if (token != null && !token.isCancelled) {
      token.cancel('Cancelled');
    }
  }

  @override
  RecentOrdersState build() {
    ref.onDispose(_cancelPendingRequest);

    ref.listen<String?>(sessionTokenProvider, (previous, next) {
      if (next == null) {
        _cancelPendingRequest();
      } else if (next != previous) {
        unawaited(loadOrders());
      }
    });

    Future.microtask(loadOrders);
    return RecentOrdersState(
      orders: createSampleRecentOrders(),
      selectedTab: RecentOrderTab.open,
      selectedOrderId: 'ord-1001-16330',
    );
  }

  /// Fetches recent orders from the backend Orders API (`GET /orders` and
  /// `GET /brands/:brandId/orders`). Falls back to existing seed state when
  /// running offline or in unmocked widget tests.
  Future<void> loadOrders({bool force = false}) async {
    if (!ref.mounted) return;
    if (state.isLoading && !force && _cancelToken != null) {
      return;
    }
    _cancelPendingRequest();
    final cancelToken = CancelToken();
    _cancelToken = cancelToken;

    state = state.copyWith(isLoading: true);

    final repo = ref.read(recentOrdersRepositoryProvider);
    try {
      final fetched = await repo.fetchRecentOrders(cancelToken: cancelToken);
      if (!ref.mounted || cancelToken.isCancelled) return;
      state = state.copyWith(
        orders: fetched,
        isLoading: false,
        clearErrorMessage: true,
      );
      final initialSelected = state.selectedOrder;
      if (initialSelected != null && !initialSelected.hasLoadedDetails) {
        unawaited(_hydrateOrderDetail(initialSelected));
      }
    } catch (_) {
      if (!ref.mounted || cancelToken.isCancelled) return;
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> refresh() => loadOrders(force: true);

  void setTab(RecentOrderTab tab) {
    if (state.selectedTab == tab) return;
    state = state.copyWith(selectedTab: tab, clearSelectedOrderId: true);
    final selected = state.selectedOrder;
    if (selected != null && !selected.hasLoadedDetails) {
      unawaited(_hydrateOrderDetail(selected));
    }
  }

  void setSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void setChannelFilter(String channel) {
    state = state.copyWith(channelFilter: channel);
  }

  void selectOrder(String orderId) {
    state = state.copyWith(selectedOrderId: orderId);
    final selected = state.selectedOrder;
    if (selected != null && !selected.hasLoadedDetails) {
      unawaited(_hydrateOrderDetail(selected));
    }
  }

  Future<void> _hydrateOrderDetail(RecentOrder order) async {
    if (!_uuidRegex.hasMatch(order.brandId) || !_uuidRegex.hasMatch(order.id)) {
      return;
    }
    try {
      final repo = ref.read(recentOrdersRepositoryProvider);
      final detailed = await repo.fetchOrderDetail(
        brandId: order.brandId,
        orderId: order.id,
      );
      if (!ref.mounted) return;
      final updated = state.orders.map((existing) {
        if (existing.id == order.id) {
          return detailed.copyWith(
            brandName: existing.brandName ?? detailed.brandName,
          );
        }
        return existing;
      }).toList();
      state = state.copyWith(orders: updated);
    } catch (_) {
      // Keep existing summary if detail request fails
    }
  }
}

final recentOrdersProvider =
    NotifierProvider<RecentOrdersNotifier, RecentOrdersState>(
      RecentOrdersNotifier.new,
    );
