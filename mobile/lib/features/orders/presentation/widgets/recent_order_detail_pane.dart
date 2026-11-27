import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/app/routes.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';

/// Detail pane for Recent Orders.
///
/// Features:
/// - Action bar (Cancel Order on open orders)
/// - Hero summary (Order code, grand total, table/pickup, payment status)
/// - 2x2 metadata grid (Status/time, Last modified, Channel, Server)
/// - Line item breakdown with indented modifiers and special notes
/// - Financial totals breakdown (Subtotal, Tax, Total)
class RecentOrderDetailPane extends StatelessWidget {
  const RecentOrderDetailPane({super.key, required this.order, this.onBack});

  final RecentOrder? order;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    if (order == null) {
      return Container(
        color: KkfcColors.surface,
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.receipt_long_outlined,
                size: 56.0,
                color: KkfcColors.ink3,
              ),
              SizedBox(height: KkfcSpace.s12),
              Text(
                'Select an order to view details',
                style: TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: KkfcTextSizes.textBase,
                  color: KkfcColors.ink3,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final ord = order!;

    return Container(
      decoration: BoxDecoration(
        color: KkfcColors.surface,
        border: const Border(
          left: BorderSide(color: KkfcColors.divider, width: 1.0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16.0,
            offset: const Offset(-2, 0),
          ),
        ],
      ),
      child: Column(
        children: [
          // 1. Action Bar (shown when Cancel Order or mobile Back is available)
          if (ord.isOpen || onBack != null) ...[
            _buildActionBar(context, ord),
            const Divider(
              height: 1.0,
              thickness: KkfcBorderWidth.thin,
              color: KkfcColors.divider,
            ),
          ],

          // 2. Scrollable Body
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(KkfcSpace.s24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Order Hero Header
                  _buildHeroHeader(ord),

                  const SizedBox(height: KkfcSpace.s20),

                  // 2x2 Metadata Grid
                  _buildMetadataGrid(ord),

                  const SizedBox(height: KkfcSpace.s24),

                  const Divider(
                    height: 1.0,
                    thickness: KkfcBorderWidth.thin,
                    color: KkfcColors.divider,
                  ),

                  const SizedBox(height: KkfcSpace.s20),

                  // Line Items Breakdown
                  _buildItemsList(ord),

                  const SizedBox(height: KkfcSpace.s24),

                  const Divider(
                    height: 1.0,
                    thickness: KkfcBorderWidth.thin,
                    color: KkfcColors.divider,
                  ),

                  const SizedBox(height: KkfcSpace.s20),

                  // Financial Receipt Breakdown
                  _buildFinancialSummary(ord),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionBar(BuildContext context, RecentOrder order) {
    return Container(
      color: KkfcColors.surface,
      padding: const EdgeInsets.symmetric(
        horizontal: KkfcSpace.s20,
        vertical: KkfcSpace.s12,
      ),
      child: Row(
        children: [
          if (onBack != null) ...[
            IconButton(
              icon: const Icon(Icons.arrow_back, color: KkfcColors.ink),
              tooltip: 'Back to list',
              onPressed: onBack,
            ),
            const SizedBox(width: KkfcSpace.s8),
          ],

          // Primary action: Cancel Order for open orders
          if (order.isOpen)
            OutlinedButton.icon(
              onPressed: () {
                context.go(
                  '${AppRoutes.cancelOrder}?orderId=${order.id}&orderCode=${order.orderCode}&ticketNumber=${order.ticketNumber}',
                );
              },
              icon: const Icon(
                Icons.cancel_outlined,
                size: 16.0,
                color: Color(0xFFB3261E),
              ),
              label: const Text(
                'Cancel Order',
                style: TextStyle(color: Color(0xFFB3261E)),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFB3261E),
                side: BorderSide(
                  color: const Color(0xFFB3261E).withValues(alpha: 0.5),
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(KkfcRadius.sm),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: KkfcSpace.s16,
                  vertical: KkfcSpace.s8,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeroHeader(RecentOrder order) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Left: Order Code & Subtitle
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Order ${order.orderCode}',
                style: const TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: 26.0,
                  fontWeight: FontWeight.w700,
                  color: KkfcColors.ink,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: KkfcSpace.s4),
              Text(
                order.tableOrPickup,
                style: const TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: KkfcTextSizes.textBase,
                  fontWeight: FontWeight.w500,
                  color: KkfcColors.ink3,
                ),
              ),
            ],
          ),
        ),

        // Right: Grand Total & Amount Due
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              formatPeso(order.totalCentavos),
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: 26.0,
                fontWeight: FontWeight.w700,
                color: KkfcColors.ink,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: KkfcSpace.s4),
            Text(
              order.amountDueCentavos == 0
                  ? '₱ 0.00 Due'
                  : '${formatPeso(order.amountDueCentavos)} Due',
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textSm,
                fontWeight: FontWeight.w500,
                color: KkfcColors.ink3,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetadataGrid(RecentOrder order) {
    return Container(
      padding: const EdgeInsets.all(KkfcSpace.s16),
      decoration: BoxDecoration(
        color: KkfcColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(KkfcRadius.md),
        border: Border.all(color: KkfcColors.border),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Top-left: Closed/Status timestamp
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.schedule_outlined,
                      size: 16.0,
                      color: KkfcColors.ink3,
                    ),
                    const SizedBox(width: KkfcSpace.s8),
                    Expanded(
                      child: Text(
                        order.statusLabel,
                        style: const TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: KkfcTextSizes.textSm,
                          fontWeight: FontWeight.w500,
                          color: KkfcColors.ink,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: KkfcSpace.s16),

              // Top-right: Last Modified
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.update_outlined,
                      size: 16.0,
                      color: KkfcColors.ink3,
                    ),
                    const SizedBox(width: KkfcSpace.s8),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: KkfcTextSizes.textSm,
                            color: KkfcColors.ink,
                          ),
                          children: [
                            const TextSpan(text: 'Last Modified: '),
                            TextSpan(
                              text: '${order.lastModified} ›',
                              style: const TextStyle(
                                color: Color(0xFF4A7C59),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: KkfcSpace.s12),

          Row(
            children: [
              // Bottom-left: Channel
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.storefront_outlined,
                      size: 16.0,
                      color: KkfcColors.ink3,
                    ),
                    const SizedBox(width: KkfcSpace.s8),
                    Expanded(
                      child: Text(
                        'Channel: ${order.channel}',
                        style: const TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: KkfcTextSizes.textSm,
                          fontWeight: FontWeight.w500,
                          color: KkfcColors.ink,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: KkfcSpace.s16),

              // Bottom-right: Server
              Expanded(
                child: Row(
                  children: [
                    const Icon(
                      Icons.person_outline_rounded,
                      size: 16.0,
                      color: KkfcColors.ink3,
                    ),
                    const SizedBox(width: KkfcSpace.s8),
                    Expanded(
                      child: Text(
                        'Server: ${order.serverName}',
                        style: const TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: KkfcTextSizes.textSm,
                          fontWeight: FontWeight.w500,
                          color: KkfcColors.ink,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList(RecentOrder order) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < order.items.length; i++) ...[
          if (i > 0) const SizedBox(height: KkfcSpace.s16),
          _buildItemRow(order.items[i]),
        ],
      ],
    );
  }

  Widget _buildItemRow(RecentOrderItem item) {
    final unitFormatted = formatPeso(item.unitPriceCentavos);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Name and Quantity x Price
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                item.name,
                style: const TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: KkfcTextSizes.textBase,
                  fontWeight: FontWeight.w600,
                  color: KkfcColors.ink,
                ),
              ),
            ),
            const SizedBox(width: KkfcSpace.s12),
            Text(
              '${item.quantity} × $unitFormatted',
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textBase,
                fontWeight: FontWeight.w500,
                color: KkfcColors.ink,
              ),
            ),
          ],
        ),

        // Modifiers (e.g. - Medium, - Sweet Potato Fries)
        for (final mod in item.modifiers) ...[
          const SizedBox(height: KkfcSpace.s2),
          Padding(
            padding: const EdgeInsets.only(left: KkfcSpace.s12),
            child: Text(
              '- $mod',
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textSm,
                color: KkfcColors.ink2,
              ),
            ),
          ),
        ],

        // Notes / Instructions (e.g. * No Lettuce, * Plus Tomato)
        for (final note in item.notes) ...[
          const SizedBox(height: KkfcSpace.s2),
          Padding(
            padding: const EdgeInsets.only(left: KkfcSpace.s12),
            child: Text(
              '* $note',
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textSm,
                fontWeight: FontWeight.w500,
                color: KkfcColors.ink2,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildFinancialSummary(RecentOrder order) {
    return Column(
      children: [
        _buildReceiptRow(
          label: 'Subtotal:',
          value: formatPeso(order.subtotalCentavos),
        ),
        const SizedBox(height: KkfcSpace.s8),
        _buildReceiptRow(
          label: 'Tax (VAT / 8.5%):',
          value: formatPeso(order.taxCentavos),
        ),
        const SizedBox(height: KkfcSpace.s12),
        const Divider(
          height: 1.0,
          thickness: KkfcBorderWidth.thick,
          color: KkfcColors.shell,
        ),
        const SizedBox(height: KkfcSpace.s12),
        _buildReceiptRow(
          label: 'Total:',
          value: formatPeso(order.totalCentavos),
          isBold: true,
          fontSize: KkfcTextSizes.textLg,
        ),
      ],
    );
  }

  Widget _buildReceiptRow({
    required String label,
    required String value,
    bool isBold = false,
    double fontSize = KkfcTextSizes.textBase,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        SizedBox(
          width: 150.0,
          child: Text(
            label,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontFamily: KkfcFonts.ibmPlexSans,
              fontSize: fontSize,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
              color: isBold ? KkfcColors.ink : KkfcColors.ink2,
            ),
          ),
        ),
        const SizedBox(width: KkfcSpace.s24),
        SizedBox(
          width: 100.0,
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontFamily: KkfcFonts.ibmPlexSans,
              fontSize: fontSize,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
              color: KkfcColors.ink,
            ),
          ),
        ),
      ],
    );
  }
}
