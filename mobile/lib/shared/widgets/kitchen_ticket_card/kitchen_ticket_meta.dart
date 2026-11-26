import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status_badge.dart';

/// "🛍 Takeaway · Call: Ana"
class KitchenTicketChannelLine extends StatelessWidget {
  const KitchenTicketChannelLine({
    super.key,
    required this.channel,
    required this.reference,
    this.useChannelSpecificIcon = false,
  });

  final String channel;
  final String reference;
  final bool useChannelSpecificIcon;

  IconData _resolveIcon() {
    if (!useChannelSpecificIcon) {
      return Icons.shopping_bag_outlined;
    }
    final normalized = channel.toLowerCase();
    if (normalized.contains('dine')) {
      return Icons.chair_alt_outlined;
    }
    if (normalized.contains('grab') ||
        normalized.contains('panda') ||
        normalized.contains('delivery')) {
      return Icons.moped_outlined;
    }
    return Icons.shopping_bag_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final label = reference.isNotEmpty ? '$channel · $reference' : channel;
    return Row(
      children: [
        Icon(_resolveIcon(), size: 16, color: KkfcColors.ticketInk),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: KkfcColors.ticketInk,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// [KK] King Kungs Kafé · [AI] Aurelia's Inasal
class KitchenTicketBrandRow extends StatelessWidget {
  const KitchenTicketBrandRow({
    super.key,
    this.brand,
    this.brands,
  }) : assert(
         brand != null || brands != null,
         'Either brand or brands must be provided',
       );

  final AssignedBrand? brand;
  final List<AssignedBrand>? brands;

  List<AssignedBrand> get _effectiveBrands {
    if (brands != null && brands!.isNotEmpty) {
      return brands!;
    }
    if (brand != null) {
      return [brand!];
    }
    return const [];
  }

  static Widget _buildBrandBadge(String code) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: KkfcColors.surface,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: KkfcColors.ticketMuted, width: 1),
      ),
      child: Text(
        code,
        style: const TextStyle(
          fontSize: KkfcTextSizes.textXs,
          fontWeight: FontWeight.w700,
          color: KkfcColors.ticketInk,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = _effectiveBrands;
    if (list.length <= 1) {
      final single = list.isNotEmpty
          ? list.first
          : const AssignedBrand(id: 'unknown', code: '??', name: 'Unknown');
      return Row(
        key: const ValueKey('kitchen-ticket-brand-row-single'),
        children: [
          _buildBrandBadge(single.code),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              single.name,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: KkfcColors.ticketBrandName,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      );
    }

    // Multi-brand layout (Option A): Badges in ticket header
    return Wrap(
      key: const ValueKey('kitchen-ticket-brand-row-multi'),
      spacing: 8,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final b in list)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(
              color: KkfcColors.canvasSunken,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: KkfcColors.border, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildBrandBadge(b.code),
                const SizedBox(width: 6),
                Text(
                  b.name,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: KkfcColors.ticketBrandName,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Status badge helper
class KitchenTicketStatusRow extends StatelessWidget {
  const KitchenTicketStatusRow({super.key, required this.status});

  final KkfcStatus status;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: KkfcStatusBadge(status: status),
    );
  }
}

/// Renders a section header label for a brand group inside a ticket's items list:
/// e.g. [GC] Gamcheon (1)
class KitchenTicketBrandGroupHeader extends StatelessWidget {
  const KitchenTicketBrandGroupHeader({
    super.key,
    required this.brand,
    this.itemCount,
  });

  final AssignedBrand brand;
  final int? itemCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: ValueKey('kitchen-ticket-brand-group-${brand.code.toLowerCase()}'),
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: KkfcColors.canvasSunken,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: KkfcColors.border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
            decoration: BoxDecoration(
              color: KkfcColors.surface,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: KkfcColors.ticketMuted, width: 1),
            ),
            child: Text(
              brand.code.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: KkfcColors.ticketInk,
              ),
            ),
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              brand.name,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: KkfcColors.ticketBrandName,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (itemCount != null) ...[
            const SizedBox(width: 6),
            Text(
              '($itemCount)',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: KkfcColors.ticketMuted,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
