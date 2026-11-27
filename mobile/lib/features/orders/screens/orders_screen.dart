import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/app/routes.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_order_detail_pane.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_orders_master_pane.dart';
import 'package:mobile/features/orders/providers/recent_orders_provider.dart';
import 'package:mobile/shared/widgets/app_header.dart';
import 'package:mobile/shared/widgets/kkfc_scaffold.dart';
import 'package:mobile/shared/widgets/wave_accents.dart';

/// Screen breakpoint for wide tablet/desktop layout matching MenuScreen.
const double _kWideBreakpoint = 768.0;

/// The Recent Orders screen displaying an adaptive master-detail layout.
///
/// Features the exact same background and AppHeader setup as MenuScreen:
/// - Signature navy shell AppHeader with decorative copper wave accents.
/// - Fluid organic canvas waves (KkfcCanvasWaves) grounding the master list.
/// - Docked detail surface panel on tablet/desktop.
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  bool _mobileShowingDetail = false;

  void _handleBack() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.menu);
    }
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= _kWideBreakpoint;
    final state = ref.watch(recentOrdersProvider);
    final selectedOrder = state.selectedOrder;

    return KkfcScaffold(
      body: Column(
        children: [
          // App header matching the MenuScreen setup
          AppHeader(title: 'Recent Orders', compact: !isWide),

          // Main body with canvas waves background
          Expanded(
            child: Stack(
              children: [
                // Fluid organic wave landscape & hand-crafted contours from the KKFC design system
                const Positioned.fill(child: KkfcCanvasWaves()),

                // Master / Detail layout
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isTabletWide =
                        constraints.maxWidth >= _kWideBreakpoint;

                    if (isTabletWide) {
                      // Split 2-pane master-detail layout
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SizedBox(
                            width: 390.0,
                            child: RecentOrdersMasterPane(
                              onBack: _handleBack,
                              onOrderSelected: (order) {
                                setState(() {
                                  _mobileShowingDetail = false;
                                });
                              },
                            ),
                          ),
                          Expanded(
                            child: RecentOrderDetailPane(order: selectedOrder),
                          ),
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
                      onBack: _handleBack,
                      onOrderSelected: (order) {
                        setState(() {
                          _mobileShowingDetail = true;
                        });
                      },
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
