import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';

/// "Current menu" selector card or compact dropdown chip:
/// In compact mode: A streamlined 40px dropdown chip with menu name and chevron.
/// In standard mode: Full-width card with "Current menu" title label.
class CurrentMenuCard extends StatelessWidget {
  const CurrentMenuCard({
    super.key,
    required this.brand,
    required this.channel,
    required this.onTap,
    this.showChannel = true,
    this.compact = false,
  });

  final AssignedBrand brand;
  final MenuChannel channel;
  final VoidCallback onTap;
  final bool showChannel;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final selectorButton = Material(
      color: Colors.transparent,
      child: InkWell(
        key: const ValueKey('current-menu-selector-card'),
        borderRadius: BorderRadius.circular(compact ? KkfcRadius.sm : 10.0),
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Ink(
          height: compact ? 40.0 : 48.0,
          padding: EdgeInsets.symmetric(horizontal: compact ? 12.0 : 16.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(compact ? KkfcRadius.sm : 10.0),
            border: Border.all(color: const Color(0xFFDDD6C9), width: 1.0),
            boxShadow: compact
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  showChannel
                      ? '${brand.name} · ${channel.label}'
                      : brand.name,
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: compact ? 13.5 : 15.0,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF19293E),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4.0),
              Icon(
                compact
                    ? Icons.keyboard_arrow_down_rounded
                    : Icons.chevron_right_rounded,
                size: compact ? 20.0 : 22.0,
                color: const Color(0xFF586579),
              ),
            ],
          ),
        ),
      ),
    );

    if (compact) {
      return selectorButton;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label: "Current menu"
        const Text(
          'Current menu',
          style: TextStyle(
            fontFamily: KkfcFonts.ibmPlexSans,
            fontSize: 13.0,
            fontWeight: FontWeight.w600,
            color: Color(0xFF586579),
          ),
        ),
        const SizedBox(height: 6.0),
        selectorButton,
      ],
    );
  }
}
