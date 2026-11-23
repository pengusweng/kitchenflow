import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/app/theme/brand_colors.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/brands/brand_logo.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_dialog.dart';
import 'package:mobile/shared/shared_layout.dart';
import 'package:mobile/shared/widgets/kkfc_loading_button.dart';

/// Returns the brand the user continued with, or null if dismissed.
Future<AssignedBrand?> showBrandPicker(
  BuildContext context, {
  required List<AssignedBrand> brands,
  required AssignedBrand current,
}) {
  return showMenuDialog<AssignedBrand>(
    context,
    builder: (_) => _BrandPickerContent(brands: brands, current: current),
  );
}

class _BrandPickerContent extends StatefulWidget {
  const _BrandPickerContent({required this.brands, required this.current});

  final List<AssignedBrand> brands;
  final AssignedBrand current;

  @override
  State<_BrandPickerContent> createState() => _BrandPickerContentState();
}

class _BrandPickerContentState extends State<_BrandPickerContent> {
  late AssignedBrand _selected = widget.current;

  String _subtitle(AssignedBrand brand) {
    final isCurrent = brand.id == widget.current.id;
    final isSelected = brand.id == _selected.id;
    if (isCurrent) {
      return isSelected ? 'Current brand · Selected' : 'Current brand';
    }
    return 'Available to this demo account';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final codes = widget.brands.map((b) => b.code).join('/');
    final selectedBrandColor = KkfcBrand.colorFor(
      _selected.code,
      _selected.name,
    );
    final selectedBrandTint = KkfcBrand.tintFor(_selected.code, _selected.name);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Eyebrow badge with station & assigned brand count
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
          decoration: BoxDecoration(
            color: selectedBrandTint,
            borderRadius: BorderRadius.circular(KkfcRadius.pill),
            border: Border.all(
              color: selectedBrandColor.withValues(alpha: 0.35),
              width: 1.0,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.storefront_rounded,
                size: 13.0,
                color: selectedBrandColor,
              ),
              const SizedBox(width: 5.0),
              Flexible(
                child: Text(
                  'DEMO ACCOUNT · ${widget.brands.length} ASSIGNED BRANDS',
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: selectedBrandColor,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: MenuSpace.sm),

        // Dialog Title
        Text(
          'Choose assigned brand',
          style: text.headlineSmall?.copyWith(
            fontFamily: KkfcFonts.ibmPlexSans,
            fontSize: 22.0,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF19293E),
            letterSpacing: -0.3,
          ),
        ),
        const SizedBox(height: MenuSpace.md),

        // Brand selection tiles
        for (final brand in widget.brands)
          Padding(
            padding: const EdgeInsets.only(bottom: MenuSpace.sm),
            child: _BrandTile(
              brand: brand,
              subtitle: _subtitle(brand),
              selected: brand.id == _selected.id,
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() => _selected = brand);
              },
            ),
          ),
        const SizedBox(height: MenuSpace.xs),

        // Informational disclaimer note
        Text(
          'Production only shows assigned brands. $codes access is '
          'illustrative, not a universal staff permission.',
          style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: MenuSpace.lg),

        // Continue Button matching the selected brand identity
        KkfcLoadingButton(
          label: 'Continue with selected brand',
          loadingLabel: 'Loading…',
          isLoading: false,
          customBackground: selectedBrandColor,
          onPressed: () {
            HapticFeedback.mediumImpact();
            Navigator.of(context).pop(_selected);
          },
        ),
      ],
    );
  }
}

class _BrandTile extends StatelessWidget {
  const _BrandTile({
    required this.brand,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final AssignedBrand brand;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    final brandColor = KkfcBrand.colorFor(brand.code, brand.name);
    final brandTint = KkfcBrand.tintFor(brand.code, brand.name);
    final logoAsset = KkfcBrand.logoFor(brand.code, brand.name);

    return Semantics(
      button: true,
      inMutuallyExclusiveGroup: true,
      checked: selected,
      label: '${brand.name}, $subtitle',
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          color: selected ? brandTint : Colors.white,
          borderRadius: BorderRadius.circular(12.0),
          border: Border.all(
            color: selected ? brandColor : const Color(0xFFDDD6C9),
            width: selected ? 2.0 : 1.0,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: brandColor.withValues(alpha: 0.16),
                    blurRadius: 10.0,
                    spreadRadius: 1.0,
                    offset: const Offset(0, 2),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 4.0,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: BorderRadius.circular(12.0),
            splashColor: brandColor.withValues(alpha: 0.12),
            highlightColor: brandColor.withValues(alpha: 0.05),
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 64.0),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12.0,
                  vertical: 10.0,
                ),
                child: Row(
                  children: [
                    // Vertical Brand Color Accent Strip
                    Container(
                      width: 4.0,
                      height: 44.0,
                      decoration: BoxDecoration(
                        color: selected
                            ? brandColor
                            : brandColor.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(2.0),
                      ),
                    ),
                    const SizedBox(width: 10.0),

                    // Dedicated Logo & Image Container
                    Container(
                      width: 58.0,
                      height: 46.0,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8.0),
                        border: Border.all(
                          color: selected
                              ? brandColor.withValues(alpha: 0.35)
                              : const Color(0xFFE5DFD4),
                          width: 1.0,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 3.0,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(7.0),
                        child: Center(
                          child: logoAsset != null
                              ? Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6.0,
                                    vertical: 4.0,
                                  ),
                                  child: Image.asset(
                                    logoAsset,
                                    fit: BoxFit.contain,
                                    filterQuality: FilterQuality.medium,
                                    gaplessPlayback: true,
                                    semanticLabel: brand.name,
                                  ),
                                )
                              : Padding(
                                  padding: const EdgeInsets.all(4.0),
                                  child: BrandLogo(brand: brand, height: 26.0),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12.0),

                    // Brand Title & Color Subtitle
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  brand.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontFamily: KkfcFonts.ibmPlexSans,
                                    fontSize: 15.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF19293E),
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
                                  color: brandColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(4.0),
                                  border: Border.all(
                                    color: brandColor.withValues(alpha: 0.3),
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
                                    color: brandColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4.0),
                          Row(
                            children: [
                              Container(
                                width: 7.0,
                                height: 7.0,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: brandColor,
                                ),
                              ),
                              const SizedBox(width: 6.0),
                              Flexible(
                                child: Text(
                                  subtitle,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: text.bodySmall?.copyWith(
                                    fontFamily: KkfcFonts.ibmPlexSans,
                                    fontSize: 12.5,
                                    fontWeight: selected
                                        ? FontWeight.w600
                                        : FontWeight.w400,
                                    color: selected
                                        ? const Color(0xFF334155)
                                        : scheme.onSurfaceVariant,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8.0),

                    // Custom Brand-Tinted Radio Selection Indicator
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: 22.0,
                      height: 22.0,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: selected ? brandColor : Colors.transparent,
                        border: Border.all(
                          color: selected
                              ? brandColor
                              : const Color(0xFFCBD5E1),
                          width: selected ? 2.0 : 1.5,
                        ),
                      ),
                      child: selected
                          ? Center(
                              child: Container(
                                width: 7.5,
                                height: 7.5,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                ),
                              ),
                            )
                          : null,
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
