import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';

/// An individual order card rendered in the Recent Orders master list.
///
/// Follows the POS visual hierarchy:
/// - Order ticket number / code
/// - Service channel or reopened state
/// - Timestamp / operational status
/// - Grand total and server name
/// - Clear active selection styling with KKFC theme tokens
class RecentOrderCard extends StatelessWidget {
  const RecentOrderCard({
    super.key,
    required this.order,
    required this.isSelected,
    required this.onTap,
  });

  final RecentOrder order;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final backgroundColor = isSelected
        ? KkfcColors.selectedTint
        : KkfcColors.surface;

    final channelTitle = order.isReopened
        ? '${order.channel} - Reopened'
        : order.channel;

    return Material(
      color: backgroundColor,
      child: InkWell(
        onTap: onTap,
        splashColor: KkfcColors.shell.withValues(alpha: 0.08),
        highlightColor: KkfcColors.shell.withValues(alpha: 0.04),
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: const BorderSide(
                color: KkfcColors.divider,
                width: KkfcBorderWidth.thin,
              ),
              left: BorderSide(
                color: isSelected ? KkfcColors.action : Colors.transparent,
                width: 4.0,
              ),
            ),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: KkfcSpace.s16,
            vertical: KkfcSpace.s12,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left details: Ticket #, Channel / Reopened, Status time
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      order.ticketNumber,
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: KkfcTextSizes.textXs,
                        fontWeight: FontWeight.w500,
                        color: KkfcColors.ink3,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: KkfcSpace.s2),
                    Text(
                      channelTitle,
                      style: TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: KkfcTextSizes.textBase,
                        fontWeight: isSelected
                            ? FontWeight.w700
                            : FontWeight.w600,
                        color: isSelected ? KkfcColors.action : KkfcColors.ink,
                      ),
                    ),
                    const SizedBox(height: KkfcSpace.s4),
                    Text(
                      order.statusLabel,
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: KkfcTextSizes.textSm,
                        fontWeight: FontWeight.w400,
                        color: KkfcColors.ink3,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(width: KkfcSpace.s12),

              // Right details: Amount and Server
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    formatPeso(order.totalCentavos),
                    style: const TextStyle(
                      fontFamily: KkfcFonts.ibmPlexSans,
                      fontSize: KkfcTextSizes.textBase,
                      fontWeight: FontWeight.w700,
                      color: KkfcColors.ink,
                    ),
                  ),
                  const SizedBox(height: KkfcSpace.s4),
                  Text(
                    order.serverName,
                    style: const TextStyle(
                      fontFamily: KkfcFonts.ibmPlexSans,
                      fontSize: KkfcTextSizes.textSm,
                      fontWeight: FontWeight.w400,
                      color: KkfcColors.ink3,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
