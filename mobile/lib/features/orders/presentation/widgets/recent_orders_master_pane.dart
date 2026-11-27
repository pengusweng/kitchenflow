import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_order_card.dart';
import 'package:mobile/features/orders/providers/recent_orders_provider.dart';

/// Master pane for Recent Orders.
///
/// Features:
/// - Open / Closed tab bar (no voided tab per requirements)
/// - Search input
/// - Channel quick-filter chips
/// - List of recent order cards
/// - Bottom bar with sorting dropdown, count, and QA live cancellation trigger.
class RecentOrdersMasterPane extends ConsumerStatefulWidget {
  const RecentOrdersMasterPane({super.key, required this.onOrderSelected});

  final ValueChanged<RecentOrder> onOrderSelected;

  @override
  ConsumerState<RecentOrdersMasterPane> createState() =>
      _RecentOrdersMasterPaneState();
}

class _RecentOrdersMasterPaneState
    extends ConsumerState<RecentOrdersMasterPane> {
  final _searchController = TextEditingController();

  static const _channels = [
    'All',
    'Dine In',
    'Takeaway',
    'GrabFood',
    'foodpanda',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(recentOrdersProvider);
    final notifier = ref.read(recentOrdersProvider.notifier);
    final filteredOrders = state.filteredOrders;
    final selectedOrder = state.selectedOrder;

    return Container(
      color: KkfcColors.canvas,
      child: Column(
        children: [
          // 1. Tab Bar (Open vs Closed) - NO Voided tab
          Container(
            color: KkfcColors.surface,
            padding: const EdgeInsets.symmetric(horizontal: KkfcSpace.s16),
            child: Row(
              children: [
                _buildTabItem(
                  key: const Key('recent-orders-tab-open'),
                  tab: RecentOrderTab.open,
                  isSelected: state.selectedTab == RecentOrderTab.open,
                  count: state.countForTab(RecentOrderTab.open),
                  onTap: () => notifier.setTab(RecentOrderTab.open),
                ),
                const SizedBox(width: KkfcSpace.s24),
                _buildTabItem(
                  key: const Key('recent-orders-tab-closed'),
                  tab: RecentOrderTab.closed,
                  isSelected: state.selectedTab == RecentOrderTab.closed,
                  count: state.countForTab(RecentOrderTab.closed),
                  onTap: () => notifier.setTab(RecentOrderTab.closed),
                ),
              ],
            ),
          ),

          const Divider(
            height: 1.0,
            thickness: KkfcBorderWidth.thin,
            color: KkfcColors.divider,
          ),

          // 2. Search Box
          Container(
            color: KkfcColors.surface,
            padding: const EdgeInsets.fromLTRB(
              KkfcSpace.s16,
              KkfcSpace.s12,
              KkfcSpace.s16,
              KkfcSpace.s8,
            ),
            child: CupertinoSearchTextField(
              controller: _searchController,
              onChanged: notifier.setSearchQuery,
              placeholder: 'Search by order # or card last four',
              placeholderStyle: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textMd,
                color: KkfcColors.ink3,
              ),
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textMd,
                color: KkfcColors.ink,
              ),
              backgroundColor: KkfcColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(KkfcRadius.md),
              padding: const EdgeInsets.symmetric(
                horizontal: KkfcSpace.s12,
                vertical: KkfcSpace.s12,
              ),
              itemColor: KkfcColors.ink3,
              itemSize: 20.0,
            ),
          ),

          // 3. Horizontal Channel Filter Chips
          Container(
            color: KkfcColors.surface,
            height: 44.0,
            padding: const EdgeInsets.symmetric(horizontal: KkfcSpace.s12),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _channels.length,
              separatorBuilder: (_, _) => const SizedBox(width: KkfcSpace.s8),
              itemBuilder: (context, index) {
                final channel = _channels[index];
                final isSelected =
                    state.channelFilter.toLowerCase() == channel.toLowerCase();

                return Center(
                  child: FilterChip(
                    label: Text(
                      channel,
                      style: TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: KkfcTextSizes.textXs,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w500,
                        color: isSelected ? Colors.white : KkfcColors.ink2,
                      ),
                    ),
                    selected: isSelected,
                    showCheckmark: false,
                    backgroundColor: KkfcColors.surfaceSubtle,
                    selectedColor: KkfcColors.shell,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(KkfcRadius.pill),
                      side: BorderSide(
                        color: isSelected
                            ? KkfcColors.shell
                            : KkfcColors.border,
                        width: 1.0,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: KkfcSpace.s8,
                      vertical: KkfcSpace.s2,
                    ),
                    visualDensity: VisualDensity.compact,
                    onSelected: (_) => notifier.setChannelFilter(channel),
                  ),
                );
              },
            ),
          ),

          const Divider(
            height: 1.0,
            thickness: KkfcBorderWidth.thin,
            color: KkfcColors.divider,
          ),

          // 4. Order List
          Expanded(
            child: filteredOrders.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(KkfcSpace.s24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.receipt_long_outlined,
                            size: 48.0,
                            color: KkfcColors.ink3.withValues(alpha: 0.5),
                          ),
                          const SizedBox(height: KkfcSpace.s12),
                          Text(
                            state.searchQuery.isEmpty
                                ? 'No ${state.selectedTab.label.toLowerCase()} orders'
                                : 'No orders matching "${state.searchQuery}"',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontFamily: KkfcFonts.ibmPlexSans,
                              fontSize: KkfcTextSizes.textBase,
                              fontWeight: FontWeight.w600,
                              color: KkfcColors.ink2,
                            ),
                          ),
                          const SizedBox(height: KkfcSpace.s4),
                          const Text(
                            'Try selecting a different tab or resetting filters.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: KkfcFonts.ibmPlexSans,
                              fontSize: KkfcTextSizes.textSm,
                              color: KkfcColors.ink3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    itemCount: filteredOrders.length,
                    itemBuilder: (context, index) {
                      final order = filteredOrders[index];
                      final isSelected = selectedOrder?.id == order.id;

                      return RecentOrderCard(
                        order: order,
                        isSelected: isSelected,
                        onTap: () {
                          notifier.selectOrder(order.id);
                          widget.onOrderSelected(order);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabItem({
    Key? key,
    required RecentOrderTab tab,
    required bool isSelected,
    required int count,
    required VoidCallback onTap,
  }) {
    return InkWell(
      key: key,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          vertical: KkfcSpace.s12,
          horizontal: KkfcSpace.s4,
        ),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? const Color(0xFF6E8B3D) : Colors.transparent,
              width: 3.0,
            ),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            RichText(
              text: TextSpan(
                text: tab.label,
                style: TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: KkfcTextSizes.textLg,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? KkfcColors.ink : KkfcColors.ink3,
                ),
              ),
            ),
            const SizedBox(width: KkfcSpace.s8),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 6.0,
                vertical: 2.0,
              ),
              decoration: BoxDecoration(
                color: isSelected ? KkfcColors.shell : KkfcColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(KkfcRadius.pill),
                border: Border.all(
                  color: isSelected ? KkfcColors.shell : KkfcColors.border,
                  width: 1.0,
                ),
              ),
              child: Text(
                count.toString(),
                style: TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: 11.0,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : KkfcColors.ink3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
