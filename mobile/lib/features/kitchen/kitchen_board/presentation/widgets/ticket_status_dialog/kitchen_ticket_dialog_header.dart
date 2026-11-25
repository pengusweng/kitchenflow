import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/shared/data/models/kitchen_ticket_data.dart';
import 'package:mobile/shared/widgets/kitchen_ticket_card/kitchen_ticket_header.dart';
import 'package:mobile/shared/widgets/kitchen_ticket_card/kitchen_ticket_meta.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

/// Top header section for [KitchenTicketStatusDialog] with live timer.
class KitchenTicketDialogHeader extends StatefulWidget {
  const KitchenTicketDialogHeader({
    super.key,
    required this.ticket,
    required this.statusLabel,
    this.statusIcon,
    this.onClose,
    this.isLive,
  });

  final KitchenBoardTicket ticket;
  final String statusLabel;
  final IconData? statusIcon;
  final VoidCallback? onClose;
  final bool? isLive;

  @override
  State<KitchenTicketDialogHeader> createState() =>
      _KitchenTicketDialogHeaderState();
}

class _KitchenTicketDialogHeaderState extends State<KitchenTicketDialogHeader> {
  late Duration _currentElapsed;
  late KitchenTicketAge _currentAge;
  late DateTime _baseStartTime;
  Timer? _ticker;

  bool get _shouldRunLive {
    if (widget.isLive != null) return widget.isLive!;
    try {
      return !Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return true;
    }
  }

  @override
  void initState() {
    super.initState();
    _initTiming();
    if (_shouldRunLive) {
      _startTicker();
    }
  }

  void _initTiming() {
    _baseStartTime = widget.ticket.data.createdAt?.toLocal() ??
        DateTime.now().subtract(widget.ticket.data.elapsed);
    if (_shouldRunLive && widget.ticket.data.createdAt != null) {
      final diff = DateTime.now().difference(_baseStartTime);
      final safeElapsed = diff.isNegative ? Duration.zero : diff;
      _currentElapsed = safeElapsed;
      _currentAge = KitchenBoardTicket.ageFromElapsed(safeElapsed);
    } else {
      _currentElapsed = widget.ticket.data.elapsed;
      _currentAge = _shouldRunLive
          ? KitchenBoardTicket.ageFromElapsed(widget.ticket.data.elapsed)
          : widget.ticket.data.age;
    }
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final wallElapsed = DateTime.now().difference(_baseStartTime);
      final safeWallElapsed =
          wallElapsed.isNegative ? Duration.zero : wallElapsed;

      final newElapsed = safeWallElapsed.inSeconds > _currentElapsed.inSeconds
          ? safeWallElapsed
          : _currentElapsed + const Duration(seconds: 1);

      final newAge = KitchenBoardTicket.ageFromElapsed(newElapsed);
      if (newElapsed.inSeconds != _currentElapsed.inSeconds ||
          newAge != _currentAge) {
        setState(() {
          _currentElapsed = newElapsed;
          _currentAge = newAge;
        });
      }
    });
  }

  @override
  void didUpdateWidget(covariant KitchenTicketDialogHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ticket != widget.ticket ||
        oldWidget.isLive != widget.isLive) {
      _initTiming();
      if (_shouldRunLive && (_ticker == null || !_ticker!.isActive)) {
        _startTicker();
      } else if (!_shouldRunLive && _ticker != null) {
        _ticker?.cancel();
        _ticker = null;
      }
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _ticker = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ticket = widget.ticket;
    final lane = ticket.lane;
    final data = ticket.data;
    final elapsedText = KitchenTicketHeader.formatElapsed(_currentElapsed);

    final isAcknowledged =
        data.status == KkfcStatus.acknowledged ||
        ticket.rawStatus.toUpperCase() == 'ACKNOWLEDGED';

    final isRework =
        data.status == KkfcStatus.reworking ||
        ticket.rawStatus.toUpperCase() == 'REWORKING';

    final isPreparing =
        data.status == KkfcStatus.preparing ||
        ticket.rawStatus.toUpperCase() == 'PREPARING';

    final isQc =
        lane == KitchenBoardLane.qcCheck ||
        data.status == KkfcStatus.checking ||
        ticket.rawStatus.toUpperCase() == 'FOR_CHECKING' ||
        ticket.rawStatus.toUpperCase() == 'CHECKING';

    final isHandover =
        lane == KitchenBoardLane.ready ||
        data.status == KkfcStatus.ready ||
        ticket.rawStatus.toUpperCase() == 'READY';

    final subtitle = isHandover
        ? 'HANDOVER'
        : (isQc ? 'QUALITY CHECK' : (isRework ? 'REWORK' : 'TICKET DETAILS'));

    final badgeIcon =
        widget.statusIcon ??
        (isRework
            ? Icons.sync_rounded
            : (isAcknowledged
                  ? Icons.visibility_outlined
                  : (isPreparing
                        ? Icons.local_fire_department_rounded
                        : lane.icon)));
    final statusColors = isRework
        ? KkfcTicketStatusColors.reworking
        : (isAcknowledged
              ? KkfcTicketStatusColors.acknowledged
              : (isPreparing
                    ? KkfcTicketStatusColors.preparing
                    : (isQc
                          ? KkfcTicketStatusColors.checking
                          : (isHandover
                                ? KkfcTicketStatusColors.ready
                                : KkfcTicketStatusColors.queued))));
    final badgeForeground = statusColors.foreground;
    final badgeBackground = statusColors.background;
    final badgeBorder = statusColors.border;

    final effectiveStatusLabel =
        isRework &&
            (widget.statusLabel == 'Preparing' ||
                widget.statusLabel == 'TICKET DETAILS')
        ? 'Rework'
        : widget.statusLabel;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(
        KkfcSpace.s20,
        KkfcSpace.s16,
        KkfcSpace.s20,
        KkfcSpace.s16,
      ),
      decoration: const BoxDecoration(
        color: KkfcColors.surface,
        border: Border(
          bottom: BorderSide(
            color: KkfcColors.border,
            width: KkfcBorderWidth.thin,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Row 1: Close button + TICKET DETAILS / T-016 + Status badge
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              OutlinedButton.icon(
                key: const ValueKey('kitchen-ticket-dialog-close-button'),
                onPressed: widget.onClose ?? () => Navigator.of(context).maybePop(),
                style: OutlinedButton.styleFrom(
                  backgroundColor: KkfcColors.surface,
                  foregroundColor: KkfcColors.ink,
                  minimumSize: const Size(0, KkfcTargets.webControl),
                  padding: const EdgeInsets.symmetric(
                    horizontal: KkfcSpace.s12,
                    vertical: KkfcSpace.s8,
                  ),
                  side: const BorderSide(
                    color: KkfcColors.borderStrong,
                    width: KkfcBorderWidth.thin,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(KkfcRadius.sm),
                  ),
                ),
                icon: const Icon(
                  Icons.close_rounded,
                  size: 16,
                  color: KkfcColors.ink,
                ),
                label: const Text(
                  'Close',
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: KkfcTextSizes.textMd,
                    fontWeight: KkfcFontWeights.bold,
                    color: KkfcColors.ink,
                  ),
                ),
              ),
              const SizedBox(width: KkfcSpace.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 11,
                        fontWeight: KkfcFontWeights.bold,
                        letterSpacing: 0.8,
                        color: KkfcColors.ink3,
                      ),
                    ),
                    Text(
                      data.ticketNumber,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: KkfcColors.ticketInk,
                        height: 1.15,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: KkfcSpace.s8),
              Container(
                key: const ValueKey('kitchen-ticket-dialog-status-badge'),
                padding: const EdgeInsets.symmetric(
                  horizontal: KkfcSpace.s12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: badgeBackground,
                  borderRadius: BorderRadius.circular(KkfcRadius.pill),
                  border: Border.all(
                    color: badgeBorder,
                    width: KkfcBorderWidth.thin,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(badgeIcon, size: 16, color: badgeForeground),
                    const SizedBox(width: 6),
                    Text(
                      effectiveStatusLabel,
                      style: TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: KkfcTextSizes.textSm,
                        fontWeight: KkfcFontWeights.bold,
                        color: badgeForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: KkfcSpace.s12),

          // Row 2: Brand badge + name and Channel + reference inline
          Wrap(
            spacing: KkfcSpace.s12,
            runSpacing: KkfcSpace.s4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              IntrinsicWidth(
                child: KitchenTicketBrandRow(
                  brand: data.brand,
                  brands: data.effectiveBrands,
                ),
              ),
              IntrinsicWidth(
                child: KitchenTicketChannelLine(
                  channel: data.channel,
                  reference: data.reference,
                  useChannelSpecificIcon: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: KkfcSpace.s12),

          // Row 3: Elapsed timer + progress bar
          Text(
            elapsedText,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: KkfcColors.ticketInk,
              fontFeatures: tabularNumberFeatures,
            ),
          ),
          const SizedBox(height: 6),
          KitchenTicketProgressBar(elapsed: _currentElapsed, age: _currentAge),
        ],
      ),
    );
  }
}
