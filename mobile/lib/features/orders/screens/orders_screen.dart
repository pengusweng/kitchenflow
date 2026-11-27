import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_order_detail_pane.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_orders_master_pane.dart';
import 'package:mobile/features/orders/providers/recent_orders_provider.dart';
import 'package:mobile/shared/widgets/app_header.dart';
import 'package:mobile/shared/widgets/kkfc_scaffold.dart';

/// The Recent Orders screen displaying an adaptive master-detail layout.
///
/// Tablet / Desktop (width >= 768px):
/// - Master pane on the left with tabs, search, filter chips, and order cards.
/// - Detail pane on the right with actions, order summary, 2x2 metadata grid, line items, and receipt totals.
///
/// Mobile (width < 768px):
/// - List view with responsive transition to detail view upon selecting an order.
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  bool _mobileShowingDetail = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(recentOrdersProvider);
    final selectedOrder = state.selectedOrder;

    return KkfcScaffold(
      appBar: const AppHeader(title: 'Recent Orders'),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= 768.0;

          if (isWide) {
            // Split 2-pane master-detail layout
            return Row(
              children: [
                SizedBox(
                  width: 390.0,
                  child: RecentOrdersMasterPane(
                    onOrderSelected: (order) {
                      setState(() {
                        _mobileShowingDetail = false;
                      });
                    },
                  ),
                ),
                const VerticalDivider(
                  width: 1.0,
                  thickness: KkfcBorderWidth.thin,
                  color: KkfcColors.divider,
                ),
                Expanded(child: RecentOrderDetailPane(order: selectedOrder)),
              ],
            );
          }

          // Single-pane compact layout for phones
          if (_mobileShowingDetail && selectedOrder != null) {
            return RecentOrderDetailPane(
              order: selectedOrder,
              onBack: () {
                setState(() {
                  _mobileShowingDetail = false;
                });
              },
            );
          }

          return RecentOrdersMasterPane(
            onOrderSelected: (order) {
              setState(() {
                _mobileShowingDetail = true;
              });
            },
          );
        },
      ),
    );
  }
}
