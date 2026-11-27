import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';

/// Loading skeleton that mirrors the exact layout, dimensions, borders, and
/// visual rhythm of [RecentOrderCard].
class RecentOrdersListSkeleton extends StatefulWidget {
  const RecentOrdersListSkeleton({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  State<RecentOrdersListSkeleton> createState() =>
      _RecentOrdersListSkeletonState();
}

class _RecentOrdersListSkeletonState extends State<RecentOrdersListSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );
  late final Animation<double> _shimmer = Tween<double>(
    begin: 0.35,
    end: 0.90,
  ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (reduceMotion) {
      _controller.stop();
      _controller.value = 0.6;
    } else if (!_controller.isAnimating) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading recent orders',
      child: AnimatedBuilder(
        animation: _shimmer,
        builder: (context, _) {
          return ListView.builder(
            key: const ValueKey('recent-orders-skeleton-list'),
            padding: const EdgeInsets.only(bottom: KkfcSpace.s16),
            itemCount: widget.itemCount,
            itemBuilder: (context, index) {
              return RecentOrderCardSkeleton(
                key: ValueKey('recent-order-skeleton-card-$index'),
                index: index,
                shimmerValue: _shimmer.value,
              );
            },
          );
        },
      ),
    );
  }
}

/// An individual skeleton placeholder card matching [RecentOrderCard].
class RecentOrderCardSkeleton extends StatelessWidget {
  const RecentOrderCardSkeleton({
    super.key,
    required this.index,
    required this.shimmerValue,
  });

  final int index;
  final double shimmerValue;

  @override
  Widget build(BuildContext context) {
    // Realistic organic variation in text placeholder lengths across cards
    final ticketWidths = [84.0, 76.0, 92.0, 80.0, 78.0];
    final channelWidths = [88.0, 110.0, 96.0, 75.0, 92.0];
    final statusWidths = [65.0, 72.0, 58.0, 80.0, 68.0];
    final priceWidths = [74.0, 68.0, 82.0, 70.0, 76.0];

    final ticketWidth = ticketWidths[index % ticketWidths.length];
    final channelWidth = channelWidths[index % channelWidths.length];
    final statusWidth = statusWidths[index % statusWidths.length];
    final priceWidth = priceWidths[index % priceWidths.length];

    final shimmerBarColor = Color.lerp(
      KkfcColors.canvasSunken,
      KkfcColors.border,
      shimmerValue,
    )!;

    final subtleShimmer = Color.lerp(
      KkfcColors.surfaceSubtle,
      KkfcColors.canvasSunken,
      shimmerValue,
    )!;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: KkfcSpace.s12,
        vertical: KkfcSpace.s4,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: KkfcColors.surface,
          borderRadius: BorderRadius.circular(KkfcRadius.md),
          border: Border.all(
            color: KkfcColors.border,
            width: KkfcBorderWidth.thin,
          ),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: KkfcSpace.s16,
          vertical: KkfcSpace.s12,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left details: Ticket #, Channel, Status placeholders
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Ticket # placeholder
                  Container(
                    height: 12.0,
                    width: ticketWidth,
                    decoration: BoxDecoration(
                      color: shimmerBarColor,
                      borderRadius: BorderRadius.circular(KkfcRadius.sm / 2),
                    ),
                  ),
                  const SizedBox(height: KkfcSpace.s4),

                  // Channel placeholder
                  Container(
                    height: 16.0,
                    width: channelWidth,
                    decoration: BoxDecoration(
                      color: subtleShimmer,
                      borderRadius: BorderRadius.circular(KkfcRadius.sm / 2),
                    ),
                  ),
                  const SizedBox(height: KkfcSpace.s4),

                  // Status placeholder
                  Container(
                    height: 13.0,
                    width: statusWidth,
                    decoration: BoxDecoration(
                      color: shimmerBarColor,
                      borderRadius: BorderRadius.circular(KkfcRadius.sm / 2),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: KkfcSpace.s12),

            // Right details: Total Amount placeholder
            Container(
              height: 16.0,
              width: priceWidth,
              decoration: BoxDecoration(
                color: shimmerBarColor,
                borderRadius: BorderRadius.circular(KkfcRadius.sm / 2),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
