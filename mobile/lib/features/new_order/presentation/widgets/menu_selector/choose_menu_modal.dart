import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/brand_colors.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/brands/brand_logo.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';

/// Shows the "Choose menu" modal bottom sheet matching the visual design.
Future<({AssignedBrand brand, MenuChannel channel})?> showChooseMenuModal(
  BuildContext context, {
  required List<AssignedBrand> brands,
  required AssignedBrand currentBrand,
  required MenuChannel currentChannel,
  bool showChannels = true,
}) {
  return showModalBottomSheet<({AssignedBrand brand, MenuChannel channel})>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => ChooseMenuModal(
      brands: brands,
      initialBrand: currentBrand,
      initialChannel: currentChannel,
      showChannels: showChannels,
    ),
  );
}

/// The "Choose menu" modal bottom sheet widget.
class ChooseMenuModal extends ConsumerStatefulWidget {
  const ChooseMenuModal({
    super.key,
    required this.brands,
    required this.initialBrand,
    required this.initialChannel,
    this.showChannels = true,
  });

  final List<AssignedBrand> brands;
  final AssignedBrand initialBrand;
  final MenuChannel initialChannel;
  final bool showChannels;

  @override
  ConsumerState<ChooseMenuModal> createState() => _ChooseMenuModalState();
}

class _ChooseMenuModalState extends ConsumerState<ChooseMenuModal> {
  late AssignedBrand _selectedBrand = widget.initialBrand;
  late MenuChannel _selectedChannel = widget.initialChannel;

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final maxHeight = mediaQuery.size.height * 0.88;
    final selectedBrandColor = KkfcBrand.colorFor(
      _selectedBrand.code,
      _selectedBrand.name,
    );
    final selectedBrandTint = KkfcBrand.tintFor(
      _selectedBrand.code,
      _selectedBrand.name,
    );

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.0)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(bottom: mediaQuery.viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top drag handle pill
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12.0, bottom: 14.0),
                  width: 38.0,
                  height: 4.0,
                  decoration: BoxDecoration(
                    color: KkfcColors.border,
                    borderRadius: BorderRadius.circular(KkfcRadius.sm),
                  ),
                ),
              ),

              // Modal Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.showChannels ? 'Choose menu' : 'Choose provider',
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 20.0,
                        fontWeight: FontWeight.w700,
                        color: KkfcColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      widget.showChannels
                          ? 'Only menus you can manage are shown.'
                          : 'Choose the provider for this menu.',
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 13.5,
                        color: KkfcColors.ink3,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16.0),

              // Brand & Channel Cards (Scrollable to prevent bottom overflow)
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (final brand in widget.brands) _buildBrandCard(brand),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12.0),

              // Bottom Actions: [ Switch provider / menu ] and [ Cancel ]
              Padding(
                padding: const EdgeInsets.fromLTRB(20.0, 8.0, 20.0, 16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Primary: Switch provider
                    ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 48.0),
                      child: SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          key: const ValueKey('switch-menu-button'),
                          onPressed: () {
                            HapticFeedback.mediumImpact();
                            Navigator.of(context).pop((
                              brand: _selectedBrand,
                              channel: _selectedChannel,
                            ));
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: KkfcColors.shell,
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(KkfcRadius.md),
                            ),
                          ),
                          child: Text(
                            widget.showChannels
                                ? 'Switch menu'
                                : 'Switch provider',
                            style: const TextStyle(
                              fontFamily: KkfcFonts.ibmPlexSans,
                              fontSize: 15.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 8.0),

                    // Secondary: Cancel
                    ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 48.0),
                      child: SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          key: const ValueKey('cancel-switch-menu-button'),
                          onPressed: () => Navigator.of(context).pop(),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.white,
                            side: const BorderSide(
                              color: KkfcColors.border,
                              width: 1.0,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(KkfcRadius.md),
                            ),
                          ),
                          child: const Text(
                            'Cancel',
                            style: TextStyle(
                              fontFamily: KkfcFonts.ibmPlexSans,
                              fontSize: 15.0,
                              fontWeight: FontWeight.w700,
                              color: KkfcColors.ink,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrandCard(AssignedBrand brand) {
    final brandColor = KkfcBrand.colorFor(brand.code, brand.name);
    final brandTint = KkfcBrand.tintFor(brand.code, brand.name);
    final logoAsset = KkfcBrand.logoFor(brand.code, brand.name);
    final bgAsset = KkfcBrand.bgFor(brand.code, brand.name);

    if (!widget.showChannels) {
      final selected = _selectedBrand.id == brand.id;
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
              color: selected
                  ? const Color(0xFF2563EB)
                  : KkfcColors.border,
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
                const Positioned.fill(
                  child: ColoredBox(color: Colors.white),
                ),

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
                            setState(() => _selectedBrand = brand);
                          }
                        : null,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 76.0),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16.0,
                          vertical: 12.0,
                        ),
                        child: Row(
                          children: [
                            // Left: Brand Name, Code Tag & Status Subtitle
                            Expanded(
                              child: Column(
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
                                              ? Colors.white
                                                  .withValues(alpha: 0.20)
                                              : brandColor
                                                  .withValues(alpha: 0.12),
                                          borderRadius:
                                              BorderRadius.circular(4.0),
                                          border: Border.all(
                                            color: selected
                                                ? Colors.white
                                                    .withValues(alpha: 0.40)
                                                : brandColor
                                                    .withValues(alpha: 0.30),
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
                                                : (isAuthorized
                                                    ? brandColor
                                                    : KkfcColors.borderStrong),
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
                                            margin: const EdgeInsets.only(
                                              right: 5.0,
                                            ),
                                            decoration: const BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: Color(0xFF60A5FA),
                                            ),
                                          ),
                                        Flexible(
                                          child: Text(
                                            selected
                                                ? 'Selected provider'
                                                : 'Available provider',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontFamily: KkfcFonts.ibmPlexSans,
                                              fontSize: 12.5,
                                              fontWeight: selected
                                                  ? FontWeight.w600
                                                  : FontWeight.w400,
                                              color: selected
                                                  ? const Color(0xFF93C5FD)
                                                  : KkfcColors.ink3,
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
                              ),
                            ),

                            // Center: Brand Logo
                            if (logoAsset != null)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10.0,
                                ),
                                child: Container(
                                  constraints: const BoxConstraints(
                                    maxHeight: 42.0,
                                    maxWidth: 110.0,
                                  ),
                                  child: Image.asset(
                                    logoAsset,
                                    fit: BoxFit.contain,
                                    filterQuality: FilterQuality.medium,
                                    gaplessPlayback: true,
                                    semanticLabel: brand.name,
                                    errorBuilder: (_, _, _) => BrandLogo(
                                      brand: brand,
                                      height: 26.0,
                                    ),
                                  ),
                                ),
                              )
                            else
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10.0,
                                ),
                                child: BrandLogo(brand: brand, height: 26.0),
                              ),

                            // Right: Selection Indicator (Checkmark / Radio outline)
                            if (!isAuthorized)
                              const Icon(
                                Icons.lock_outline,
                                color: KkfcColors.borderStrong,
                                size: 22.0,
                              )
                            else if (selected)
                              Container(
                                width: 24.0,
                                height: 24.0,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Color(0xFF2563EB),
                                ),
                                child: const Icon(
                                  Icons.check_rounded,
                                  size: 15.0,
                                  color: Colors.white,
                                ),
                              )
                            else
                              Container(
                                width: 24.0,
                                height: 24.0,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: KkfcColors.borderStrong,
                                    width: 1.5,
                                  ),
                                ),
                              ),
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

    final channelsAsync = ref.watch(brandChannelsProvider(brand));
    final defaultChannels =
        brand.channels ??
        (brand.code.toUpperCase().contains('AI')
            ? const [MenuChannel.dineIn]
            : const [MenuChannel.dineIn, MenuChannel.takeaway]);

    final isAuthorized =
        channelsAsync.value?.isAuthorized ?? brand.isAuthorized;
    final channels = channelsAsync.value?.channels ?? defaultChannels;
    final isBrandActive = _selectedBrand.id == brand.id;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12.0),
      padding: const EdgeInsets.fromLTRB(14.0, 12.0, 14.0, 10.0),
      decoration: BoxDecoration(
        color: isBrandActive ? brandTint : KkfcColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(
          color: isBrandActive
              ? brandColor.withValues(alpha: 0.6)
              : KkfcColors.border,
          width: isBrandActive ? 1.5 : 1.0,
        ),
        boxShadow: isBrandActive
            ? [
                BoxShadow(
                  color: brandColor.withValues(alpha: 0.08),
                  blurRadius: 8.0,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Brand Header with Accent strip, Logo & Code badge
          Row(
            children: [
              Container(
                width: 3.5,
                height: 24.0,
                decoration: BoxDecoration(
                  color: isAuthorized ? brandColor : KkfcColors.border,
                  borderRadius: BorderRadius.circular(2.0),
                ),
              ),
              const SizedBox(width: 8.0),
              // Mini logo container
              Container(
                width: 36.0,
                height: 28.0,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(6.0),
                  border: Border.all(
                    color: KkfcColors.border,
                    width: 1.0,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(5.0),
                  child: Center(
                    child: logoAsset != null
                        ? Padding(
                            padding: const EdgeInsets.all(3.0),
                            child: Image.asset(
                              logoAsset,
                              fit: BoxFit.contain,
                              filterQuality: FilterQuality.medium,
                            ),
                          )
                        : Padding(
                            padding: const EdgeInsets.all(2.0),
                            child: BrandLogo(brand: brand, height: 18.0),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 8.0),
              Flexible(
                child: Text(
                  brand.name,
                  style: const TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: KkfcColors.ink,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6.0),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 5.0,
                  vertical: 1.0,
                ),
                decoration: BoxDecoration(
                  color: brandColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4.0),
                  border: Border.all(
                    color: brandColor.withValues(alpha: 0.25),
                    width: 1.0,
                  ),
                ),
                child: Text(
                  brand.code,
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 10.0,
                    fontWeight: FontWeight.w800,
                    color: brandColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10.0),

          if (isAuthorized)
            // Authorized Channels List with Radio Options
            Column(
              children: [
                for (final channel in channels)
                  _buildChannelRadioRow(brand, channel, brandColor),
              ],
            )
          else
            // Unauthorized State: 🔒 Not authorized
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6.0),
              child: Row(
                children: const [
                  Icon(
                    Icons.lock_outline,
                    size: 16.0,
                    color: KkfcColors.ink3,
                  ),
                  SizedBox(width: 8.0),
                  Expanded(
                    child: Text(
                      'Not authorized',
                      style: TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                        color: KkfcColors.ink3,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildChannelRadioRow(
    AssignedBrand brand,
    MenuChannel channel,
    Color brandColor,
  ) {
    final isSelected =
        _selectedBrand.id == brand.id && _selectedChannel == channel;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(6.0),
        onTap: () {
          HapticFeedback.selectionClick();
          setState(() {
            _selectedBrand = brand;
            _selectedChannel = channel;
          });
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 7.0, horizontal: 2.0),
          child: Row(
            children: [
              // Custom Radio Indicator matching brand color
              Container(
                width: 20.0,
                height: 20.0,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected ? brandColor : KkfcColors.borderStrong,
                    width: isSelected ? 2.0 : 1.5,
                  ),
                  color: isSelected ? brandColor : Colors.transparent,
                ),
                child: isSelected
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

              const SizedBox(width: 12.0),

              // Channel label
              Expanded(
                child: Text(
                  channel.label,
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 14.0,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? KkfcColors.ink
                        : KkfcColors.ink2,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
