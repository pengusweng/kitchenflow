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

/// Brand + channel selection card used in [ChooseMenuModal] when `showChannels == true`.
class ChooseBrandChannelCard extends ConsumerWidget {
  const ChooseBrandChannelCard({
    super.key,
    required this.brand,
    required this.selectedBrand,
    required this.selectedChannel,
    required this.onSelect,
  });

  final AssignedBrand brand;
  final AssignedBrand selectedBrand;
  final MenuChannel selectedChannel;
  final void Function(AssignedBrand brand, MenuChannel channel) onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brandColor = KkfcBrand.colorFor(brand.code, brand.name);
    final brandTint = KkfcBrand.tintFor(brand.code, brand.name);
    final logoAsset = KkfcBrand.logoFor(brand.code, brand.name);

    final channelsAsync = ref.watch(brandChannelsProvider(brand));
    final defaultChannels =
        brand.channels ??
        (brand.code.toUpperCase().contains('AI')
            ? const [MenuChannel.dineIn]
            : const [MenuChannel.dineIn, MenuChannel.takeaway]);

    final isAuthorized =
        channelsAsync.value?.isAuthorized ?? brand.isAuthorized;
    final channels = channelsAsync.value?.channels ?? defaultChannels;
    final isBrandActive = selectedBrand.id == brand.id;

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
                  _buildChannelRadioRow(channel, brandColor),
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

  Widget _buildChannelRadioRow(MenuChannel channel, Color brandColor) {
    final isSelected =
        selectedBrand.id == brand.id && selectedChannel == channel;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(6.0),
        onTap: () {
          HapticFeedback.selectionClick();
          onSelect(brand, channel);
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
                    color: isSelected ? KkfcColors.ink : KkfcColors.ink2,
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
