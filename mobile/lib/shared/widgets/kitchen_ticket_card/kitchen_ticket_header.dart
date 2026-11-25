import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/shared/data/models/kitchen_ticket_data.dart';

class KitchenTicketHeader extends StatefulWidget {
  const KitchenTicketHeader({
    super.key,
    required this.ticketNumber,
    required this.elapsed,
    required this.age,
    this.createdAt,
    this.isLive,
  });

  final String ticketNumber;
  final Duration elapsed;
  final KitchenTicketAge age;
  final DateTime? createdAt;
  final bool? isLive;

  static String formatElapsed(Duration d) {
    final safeDuration = d.isNegative ? Duration.zero : d;
    final m = safeDuration.inMinutes;
    final s = (safeDuration.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  State<KitchenTicketHeader> createState() => _KitchenTicketHeaderState();
}

class _KitchenTicketHeaderState extends State<KitchenTicketHeader> {
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
    _baseStartTime = widget.createdAt?.toLocal() ??
        DateTime.now().subtract(widget.elapsed);
    if (_shouldRunLive && widget.createdAt != null) {
      final diff = DateTime.now().difference(_baseStartTime);
      final safeElapsed = diff.isNegative ? Duration.zero : diff;
      _currentElapsed = safeElapsed;
      _currentAge = KitchenBoardTicket.ageFromElapsed(safeElapsed);
    } else {
      _currentElapsed = widget.elapsed;
      _currentAge = _shouldRunLive
          ? KitchenBoardTicket.ageFromElapsed(widget.elapsed)
          : widget.age;
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
  void didUpdateWidget(covariant KitchenTicketHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.elapsed != widget.elapsed ||
        oldWidget.createdAt != widget.createdAt ||
        oldWidget.isLive != widget.isLive ||
        oldWidget.age != widget.age) {
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
    final time = KitchenTicketHeader.formatElapsed(_currentElapsed);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Flexible(
              child: Text(
                widget.ticketNumber,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: KkfcColors.ticketInk,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              time,
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: KkfcColors.ticketInk,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Semantics(
          label: 'Ticket age $time, ${_ageLabel(_currentAge)}',
          excludeSemantics: true,
          child: KitchenTicketProgressBar(
            elapsed: _currentElapsed,
            age: _currentAge,
          ),
        ),
        if (_currentAge != KitchenTicketAge.onTime) ...[
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: Row(
              key: const ValueKey('kitchen-ticket-age-cue'),
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _currentAge == KitchenTicketAge.late
                      ? Icons.error_outline_rounded
                      : Icons.schedule_rounded,
                  size: 14,
                  color: KkfcColors.ticketInk,
                ),
                const SizedBox(width: 4),
                Text(
                  _ageLabel(_currentAge).toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: KkfcColors.ticketInk,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  static String _ageLabel(KitchenTicketAge age) => switch (age) {
    KitchenTicketAge.onTime => 'On time',
    KitchenTicketAge.dueSoon => 'Due soon',
    KitchenTicketAge.late => 'Late',
  };
}

class KitchenTicketProgressBar extends StatelessWidget {
  const KitchenTicketProgressBar({
    super.key,
    required this.elapsed,
    required this.age,
  });

  final Duration elapsed;
  final KitchenTicketAge age;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 12,
      child: CustomPaint(
        painter: _ProgressBarPainter(elapsed: elapsed, age: age),
      ),
    );
  }
}

class _ProgressBarPainter extends CustomPainter {
  const _ProgressBarPainter({required this.elapsed, required this.age});

  final Duration elapsed;
  final KitchenTicketAge age;

  @override
  void paint(Canvas canvas, Size size) {
    const barHeight = 5.0;
    final barY = (size.height - barHeight) / 2;
    const barRadius = Radius.circular(2.5);

    // Track
    final trackPaint = Paint()
      ..color = KkfcColors.ticketBorder
      ..style = PaintingStyle.fill;
    final trackRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, barY, size.width, barHeight),
      barRadius,
    );
    canvas.drawRRect(trackRect, trackPaint);

    // Fill (up to 30 min = 100%)
    const maxSeconds = 30 * 60.0;
    final progress = (elapsed.inSeconds / maxSeconds).clamp(0.02, 1.0);
    final fillWidth = size.width * progress;

    final fillColor = switch (age) {
      KitchenTicketAge.onTime => KkfcColors.ticketAgeOnTime,
      KitchenTicketAge.dueSoon => KkfcColors.ticketAgeDueSoon,
      KitchenTicketAge.late => KkfcColors.ticketAgeLate,
    };

    final fillPaint = Paint()
      ..color = fillColor
      ..style = PaintingStyle.fill;
    final fillRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, barY, fillWidth, barHeight),
      barRadius,
    );
    canvas.drawRRect(fillRect, fillPaint);

    // Tick lines at 15 min (50%) and 20 min (66.7%)
    final tickPaint = Paint()
      ..color = KkfcColors.ticketSubtleInk
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    const tickHeight = 11.0;
    final tickY1 = (size.height - tickHeight) / 2;
    final tickY2 = tickY1 + tickHeight;

    // Tick line at 15 min (50% of 30 min)
    final tick1X = size.width * 0.50;
    canvas.drawLine(Offset(tick1X, tickY1), Offset(tick1X, tickY2), tickPaint);

    // Tick line at 20 min (66.7% of 30 min)
    final tick2X = size.width * (20.0 / 30.0);
    canvas.drawLine(Offset(tick2X, tickY1), Offset(tick2X, tickY2), tickPaint);
  }

  @override
  bool shouldRepaint(covariant _ProgressBarPainter oldDelegate) =>
      oldDelegate.elapsed != elapsed || oldDelegate.age != age;
}
