import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/app/theme/brand_colors.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/brands/brand_logo.dart';

/// Provider selection card used in [ChooseMenuModal] when `showChannels == false`.
class ChooseProviderCard extends StatelessWidget {
  const ChooseProviderCard({
    super.key,
    required this.brand,
    required this.selected,
    required this.onSelect,
  });

  final AssignedBrand brand;
  final bool selected;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    final brandColor = KkfcBrand.colorFor(brand.code, brand.name);
    final logoAsset = KkfcBrand.logoFor(brand.code, brand.name);
    final bgAsset = KkfcBrand.bgFor(brand.code, brand.name);
    final isAuthorized = brand.isAuthorized;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(
            color: selected ? const Color(0xFF2563EB) : KkfcColors.border,
            width: selected ? 2.0 : 1.0,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.22),
                    blurRadius: 10.0,
                    spreadRadius: 1.0,
                    offset: const Offset(0, 3),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 4.0,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15.0),
          child: Stack(
            children: [
              // 0. Solid white under-layer guaranteeing WCAG contrast
              const Positioned.fill(child: ColoredBox(color: Colors.white)),

              // 1. Background Food Image from mobile/assets/bg/
              if (bgAsset != null)
                Positioned.fill(
                  child: Image.asset(
                    bgAsset,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const SizedBox.shrink(),
                  ),
                ),

              // 2. Tint Overlay: Deep navy for selected, warm ivory for unselected (boosted to 0.93/0.90 for dark photos)
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: selected
                        ? LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [
                              const Color(0xFF132B4A).withValues(alpha: 0.90),
                              const Color(0xFF1B3B66).withValues(alpha: 0.82),
                            ],
                          )
                        : LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [
                              Colors.white.withValues(alpha: 0.93),
                              const Color(0xFFFFFDF9).withValues(alpha: 0.90),
                            ],
                          ),
                  ),
                ),
              ),

              // 3. Interactive tap surface and content
              Material(
                type: MaterialType.transparency,
                child: InkWell(
                  key: ValueKey('select-provider-${brand.id}'),
                  splashColor: selected
                      ? Colors.white.withValues(alpha: 0.10)
                      : brandColor.withValues(alpha: 0.08),
                  highlightColor: Colors.transparent,
                  onTap: isAuthorized
                      ? () {
                          HapticFeedback.selectionClick();
                          onSelect();
                        }
                      : null,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 80.0),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16.0,
                        vertical: 12.0,
                      ),
                      child: Row(
                        children: [
                          // Left: Brand Name, Code Tag & Status Subtitle
                          Expanded(
                            child: _buildBrandInfo(brandColor, isAuthorized),
                          ),

                          // Center: Brand Logo
                          _buildBrandLogo(logoAsset),

                          // Right: Selection Indicator (Checkmark / Radio outline)
                          _buildSelectionIndicator(isAuthorized),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrandInfo(Color brandColor, bool isAuthorized) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(
                brand.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: 15.0,
                  fontWeight: FontWeight.w700,
                  color: selected
                      ? Colors.white
                      : (isAuthorized
                            ? KkfcColors.ink
                            : KkfcColors.borderStrong),
                ),
              ),
            ),
            const SizedBox(width: 6.0),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 6.0,
                vertical: 1.5,
              ),
              decoration: BoxDecoration(
                color: selected
                    ? Colors.white.withValues(alpha: 0.20)
                    : brandColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(4.0),
                border: Border.all(
                  color: selected
                      ? Colors.white.withValues(alpha: 0.40)
                      : brandColor.withValues(alpha: 0.30),
                  width: 1.0,
                ),
              ),
              child: Text(
                brand.code,
                style: TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                  color: selected
                      ? Colors.white
                      : (isAuthorized ? brandColor : KkfcColors.borderStrong),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4.0),
        if (isAuthorized)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (selected)
                Container(
                  width: 6.0,
                  height: 6.0,
                  margin: const EdgeInsets.only(right: 5.0),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFF60A5FA),
                  ),
                ),
              Flexible(
                child: Text(
                  selected ? 'Selected provider' : 'Available provider',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 12.5,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    color: selected ? const Color(0xFF93C5FD) : KkfcColors.ink3,
                  ),
                ),
              ),
            ],
          )
        else
          Row(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(
                Icons.lock_outline,
                size: 13.0,
                color: KkfcColors.borderStrong,
              ),
              SizedBox(width: 4.0),
              Flexible(
                child: Text(
                  'Not authorized',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 12.0,
                    color: KkfcColors.borderStrong,
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildBrandLogo(String? logoAsset) {
    if (logoAsset != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10.0),
        child: Container(
          constraints: const BoxConstraints(maxHeight: 52.0, maxWidth: 135.0),
          child: Image.asset(
            logoAsset,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.medium,
            gaplessPlayback: true,
            semanticLabel: brand.name,
            errorBuilder: (_, _, _) => BrandLogo(brand: brand, height: 32.0),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10.0),
      child: BrandLogo(brand: brand, height: 32.0),
    );
  }

  Widget _buildSelectionIndicator(bool isAuthorized) {
    if (!isAuthorized) {
      return const Icon(
        Icons.lock_outline,
        color: KkfcColors.borderStrong,
        size: 22.0,
      );
    }
    if (selected) {
      return Container(
        width: 24.0,
        height: 24.0,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: Color(0xFF2563EB),
        ),
        child: const Icon(Icons.check_rounded, size: 15.0, color: Colors.white),
      );
    }
    return Container(
      width: 24.0,
      height: 24.0,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: KkfcColors.borderStrong, width: 1.5),
      ),
    );
  }
}
