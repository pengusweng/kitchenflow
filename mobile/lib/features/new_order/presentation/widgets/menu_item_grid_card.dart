import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/item_customization_dialog.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';

/// An impeccable grid card for menu items containing strictly the item's
/// image, name, and price.
class MenuItemGridCard extends ConsumerStatefulWidget {
  const MenuItemGridCard({
    super.key,
    required this.item,
    required this.channel,
  });

  final MenuItem item;
  final MenuChannel channel;

  @override
  ConsumerState<MenuItemGridCard> createState() => _MenuItemGridCardState();
}

class _MenuItemGridCardState extends ConsumerState<MenuItemGridCard> {
  bool _cardPressed = false;

  Future<void> _onAdd(MenuItem item) async {
    HapticFeedback.lightImpact();

    final brand = ref.read(activeBrandProvider);
    await showItemCustomizationDialog(
      context,
      item: item,
      channel: widget.channel,
      brandName: brand.name,
    );

    if (mounted) {
      setState(() => _cardPressed = false);
    }
  }

  Widget _buildImage(MenuItem item) {
    final url = item.imageUrl;

    if (url != null && url.isNotEmpty) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return Image.network(
          url,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const _DishImagePlaceholder(),
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return const _DishImagePlaceholder();
          },
        );
      } else {
        return Image.asset(
          url,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const _DishImagePlaceholder(),
        );
      }
    }
    return const _DishImagePlaceholder();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final availability = item.availabilityFor(widget.channel);
    final orderable = availability == MenuAvailability.available;
    final price = formatPeso(item.priceFor(widget.channel));

    return Semantics(
      button: true,
      enabled: orderable,
      label: '${item.name}, $price',
      child: AnimatedScale(
        scale: _cardPressed && orderable ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOutCubic,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            key: ValueKey('menu-grid-card-${item.id}'),
            borderRadius: BorderRadius.circular(KkfcRadius.sm),
            onTap: orderable ? () => _onAdd(item) : null,
            onTapDown: (_) {
              if (orderable) setState(() => _cardPressed = true);
            },
            onTapCancel: () {
              if (orderable) setState(() => _cardPressed = false);
            },
            onTapUp: (_) {
              if (orderable) setState(() => _cardPressed = false);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              curve: Curves.easeOut,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(KkfcRadius.sm),
                border: Border.all(
                  color: _cardPressed
                      ? const Color(0xFF76849A)
                      : const Color(0xFFDDD6C9),
                  width: 1.0,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(
                      alpha: _cardPressed ? 0.08 : 0.035,
                    ),
                    blurRadius: _cardPressed ? 6 : 4,
                    offset: Offset(0, _cardPressed ? 2 : 1),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(8.0),
              child: Opacity(
                opacity: orderable ? 1.0 : 0.70,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Menu item image fills top available space of the box
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(KkfcRadius.sm - 2),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            _buildImage(item),
                            if (!orderable)
                              Container(
                                color: Colors.white.withValues(alpha: 0.65),
                                alignment: Alignment.center,
                                child: _GridAvailabilityBadge(
                                  widget.item.availabilityFor(widget.channel),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 6.0),

                    // 2. Menu item name
                    Text(
                      item.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF19293E),
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 2.0),

                    // 3. Menu item price
                    Text(
                      price,
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF19293E),
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DishImagePlaceholder extends StatelessWidget {
  const _DishImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF4EFE6),
      child: Center(
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: const Icon(
            Icons.restaurant_rounded,
            size: 18,
            color: Color(0xFF8C7D6B),
          ),
        ),
      ),
    );
  }
}

class _GridAvailabilityBadge extends StatelessWidget {
  const _GridAvailabilityBadge(this.availability);

  final MenuAvailability availability;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, label) = switch (availability) {
      MenuAvailability.stockout => (
        const Color(0xFFFEE4E2),
        const Color(0xFFB42318),
        'STOCKOUT',
      ),
      MenuAvailability.manualOff => (
        const Color(0xFFFEE4E2),
        const Color(0xFFB42318),
        'MANUAL OFF',
      ),
      MenuAvailability.inactive => (
        const Color(0xFFF2F4F7),
        const Color(0xFF475467),
        'INACTIVE',
      ),
      MenuAvailability.available => (
        Colors.transparent,
        Colors.transparent,
        '',
      ),
    };
    if (label.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 3.0),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: KkfcFonts.ibmPlexSans,
          fontSize: 10.0,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}
