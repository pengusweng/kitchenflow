import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/shared/data/models/kitchen_ticket_data.dart';

/// Displays the historical Quality Check attempts for a ticket in QC Check
/// or Rework states, populated from `GET /api/kitchen-qc/ticket/{ticketId}`.
class KitchenTicketPastQcAttemptsCard extends StatefulWidget {
  const KitchenTicketPastQcAttemptsCard({
    super.key,
    required this.ticket,
    this.attempts,
    this.isLoading = false,
    this.initiallyExpanded = true,
  });

  final KitchenBoardTicket ticket;
  final List<KitchenQcAttempt>? attempts;
  final bool isLoading;
  final bool initiallyExpanded;

  @override
  State<KitchenTicketPastQcAttemptsCard> createState() =>
      _KitchenTicketPastQcAttemptsCardState();
}

class _KitchenTicketPastQcAttemptsCardState
    extends State<KitchenTicketPastQcAttemptsCard> {
  late bool _isExpanded;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
  }

  String? _resolveItemName(String orderItemId) {
    if (orderItemId.isEmpty) return null;
    for (final item in widget.ticket.data.items) {
      if (item.orderItemId == orderItemId) {
        return item.name;
      }
    }
    return null;
  }

  KitchenTicketItem? _resolveItem(String orderItemId) {
    if (orderItemId.isEmpty) return null;
    for (final item in widget.ticket.data.items) {
      if (item.orderItemId == orderItemId) {
        return item;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final effectiveAttempts = (widget.attempts ?? widget.ticket.pastQcAttempts)
        .where((a) => !a.isInProgress)
        .toList(growable: false);

    if (effectiveAttempts.isEmpty && !widget.isLoading) {
      return const SizedBox.shrink();
    }

    return Container(
      key: const ValueKey('kitchen-ticket-past-qc-attempts-card'),
      decoration: BoxDecoration(
        color: KkfcColors.surface,
        borderRadius: BorderRadius.circular(KkfcRadius.md),
        border: Border.all(
          color: KkfcColors.border,
          width: KkfcBorderWidth.thin,
        ),
      ),
      padding: const EdgeInsets.all(KkfcSpace.s16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            key: const ValueKey('past-qc-attempts-toggle-button'),
            onTap: _toggleExpanded,
            borderRadius: BorderRadius.circular(KkfcRadius.sm),
            child: Row(
              children: [
                const Icon(
                  Icons.history_rounded,
                  size: 16,
                  color: KkfcColors.reworkText,
                ),
                const SizedBox(width: KkfcSpace.s8),
                const Expanded(
                  child: Text(
                    'Past QC attempts',
                    style: TextStyle(
                      fontFamily: KkfcFonts.ibmPlexSans,
                      fontSize: KkfcTextSizes.textBase,
                      fontWeight: KkfcFontWeights.bold,
                      color: KkfcColors.ticketInk,
                    ),
                  ),
                ),
                if (effectiveAttempts.isNotEmpty) ...[
                  Container(
                    key: const ValueKey('past-qc-attempts-count-badge'),
                    padding: const EdgeInsets.symmetric(
                      horizontal: KkfcSpace.s8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: KkfcColors.reworkBg,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: KkfcColors.reworkBorder,
                        width: KkfcBorderWidth.thin,
                      ),
                    ),
                    child: Text(
                      '${effectiveAttempts.length}',
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: KkfcTextSizes.textXs,
                        fontWeight: KkfcFontWeights.bold,
                        color: KkfcColors.reworkText,
                      ),
                    ),
                  ),
                  const SizedBox(width: KkfcSpace.s4),
                ],
                Icon(
                  _isExpanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                  size: 20,
                  color: KkfcColors.ink2,
                ),
              ],
            ),
          ),
          if (_isExpanded) ...[
            if (widget.isLoading && effectiveAttempts.isEmpty) ...[
              const SizedBox(height: KkfcSpace.s12),
              const Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ] else ...[
              const SizedBox(height: KkfcSpace.s12),
              for (var i = 0; i < effectiveAttempts.length; i++) ...[
                if (i > 0) const SizedBox(height: KkfcSpace.s8),
                _buildAttemptTile(effectiveAttempts[i]),
              ],
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildAttemptTile(KitchenQcAttempt attempt) {
    final isFailed = attempt.isFailed;
    final statusLabel = isFailed
        ? 'Failed'
        : (attempt.isPassed ? 'Passed' : attempt.status);
    final badgeBg = isFailed ? KkfcColors.reworkBg : KkfcColors.qcPassBg;
    final badgeBorder = isFailed
        ? KkfcColors.reworkBorder
        : KkfcColors.qcPassBg;
    final badgeText = isFailed ? KkfcColors.reworkText : KkfcColors.onSolid;

    final timeLabel = attempt.formattedTimeLabel;
    final checkerName = attempt.checkerName;
    final metaParts = <String>[
      if (checkerName != null && checkerName.isNotEmpty)
        'Checked by $checkerName',
      if (timeLabel != null && timeLabel.isNotEmpty) timeLabel,
    ];

    return Container(
      key: ValueKey('past-qc-attempt-tile-${attempt.attemptNumber}'),
      padding: const EdgeInsets.all(KkfcSpace.s12),
      decoration: BoxDecoration(
        color: KkfcColors.canvas,
        borderRadius: BorderRadius.circular(KkfcRadius.sm),
        border: Border.all(
          color: KkfcColors.border,
          width: KkfcBorderWidth.thin,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Attempt #${attempt.attemptNumber}',
                style: const TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: KkfcTextSizes.textSm,
                  fontWeight: KkfcFontWeights.bold,
                  color: KkfcColors.ticketInk,
                ),
              ),
              const SizedBox(width: KkfcSpace.s8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: badgeBorder,
                    width: KkfcBorderWidth.thin,
                  ),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: KkfcTextSizes.textXs,
                    fontWeight: KkfcFontWeights.bold,
                    color: badgeText,
                  ),
                ),
              ),
            ],
          ),
          if (metaParts.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              metaParts.join(' · '),
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textXs,
                fontWeight: KkfcFontWeights.regular,
                color: KkfcColors.ink2,
              ),
            ),
          ],
          if (attempt.rejections.isNotEmpty) ...[
            const SizedBox(height: KkfcSpace.s8),
            for (var j = 0; j < attempt.rejections.length; j++) ...[
              if (j > 0) const SizedBox(height: 6),
              _buildRejectionLine(attempt.rejections[j]),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildRejectionLine(KitchenQcRejection rejection) {
    final matchedItem = _resolveItem(rejection.orderItemId);
    final itemName = _resolveItemName(rejection.orderItemId);
    final portionReason = rejection.formatWithPortion(
      itemQuantity: matchedItem?.quantity,
    );
    final fullText = itemName != null && itemName.isNotEmpty
        ? '$itemName — $portionReason'
        : portionReason;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Icon(
            Icons.error_outline_rounded,
            size: 14,
            color: KkfcColors.reworkText,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            fullText,
            style: const TextStyle(
              fontFamily: KkfcFonts.ibmPlexSans,
              fontSize: KkfcTextSizes.textSm,
              fontWeight: KkfcFontWeights.medium,
              color: KkfcColors.ticketInk,
            ),
          ),
        ),
      ],
    );
  }
}
