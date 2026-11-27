import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';

/// An individual order card rendered in the Recent Orders master list.
///
/// Follows the POS visual hierarchy and backend Orders API fields:
/// - Order ticket number / code
/// - Service channel
/// - Operational status
/// - Grand total
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

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: KkfcSpace.s12,
        vertical: KkfcSpace.s4,
      ),
      child: AnimatedContainer(
        duration: KkfcMotion.durMicro,
        curve: KkfcMotion.easeOut,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(KkfcRadius.md),
          border: Border.all(
            color: isSelected ? KkfcColors.action : KkfcColors.border,
            width: isSelected ? 1.5 : 1.0,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 4.0,
                    offset: const Offset(0.0, 2.0),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(KkfcRadius.md),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(KkfcRadius.md),
            splashColor: KkfcColors.shell.withValues(alpha: 0.08),
            highlightColor: KkfcColors.shell.withValues(alpha: 0.04),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: KkfcSpace.s16,
                vertical: KkfcSpace.s12,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Left details: Ticket #, Channel, Status
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
                          order.channel,
                          style: TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: KkfcTextSizes.textBase,
                            fontWeight: isSelected
                                ? FontWeight.w700
                                : FontWeight.w600,
                            color: isSelected
                                ? KkfcColors.action
                                : KkfcColors.ink,
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

                  // Right details: Total Amount
                  Text(
                    formatPeso(order.totalCentavos),
                    style: const TextStyle(
                      fontFamily: KkfcFonts.ibmPlexSans,
                      fontSize: KkfcTextSizes.textBase,
                      fontWeight: FontWeight.w700,
                      color: KkfcColors.ink,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
