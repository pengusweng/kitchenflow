import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_selector/choose_brand_channel_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_selector/choose_provider_card.dart';

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
    if (!widget.showChannels) {
      return ChooseProviderCard(
        brand: brand,
        selected: _selectedBrand.id == brand.id,
        onSelect: () => setState(() => _selectedBrand = brand),
      );
    }

    return ChooseBrandChannelCard(
      brand: brand,
      selectedBrand: _selectedBrand,
      selectedChannel: _selectedChannel,
      onSelect: (selectedBrand, selectedChannel) {
        setState(() {
          _selectedBrand = selectedBrand;
          _selectedChannel = selectedChannel;
        });
      },
    );
  }
}
