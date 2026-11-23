import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/data/repositories/menu_item_modifier_repository.dart';
import 'package:mobile/features/new_order/presentation/widgets/customization_quantity_stepper.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

/// Shows the item customization modal popup matching the visual design.
/// Returns true if the item was added or updated in the cart.
Future<bool?> showItemCustomizationDialog(
  BuildContext context, {
  required MenuItem item,
  required MenuChannel channel,
  required String brandName,
  CartLine? editing,
}) {
  return showGeneralDialog<bool>(
    context: context,
    barrierDismissible: true,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.transparent,
    transitionDuration: const Duration(milliseconds: 220),
    pageBuilder: (ctx, anim1, anim2) => ItemCustomizationDialog(
      item: item,
      channel: channel,
      brandName: brandName,
      editing: editing,
    ),
    transitionBuilder: (ctx, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.95, end: 1.0).animate(curved),
          child: child,
        ),
      );
    },
  );
}

class ItemCustomizationDialog extends ConsumerStatefulWidget {
  const ItemCustomizationDialog({
    super.key,
    required this.item,
    required this.channel,
    required this.brandName,
    this.editing,
  });

  final MenuItem item;
  final MenuChannel channel;
  final String brandName;
  final CartLine? editing;

  @override
  ConsumerState<ItemCustomizationDialog> createState() =>
      _ItemCustomizationDialogState();
}

class _ItemCustomizationDialogState
    extends ConsumerState<ItemCustomizationDialog>
    with SingleTickerProviderStateMixin {
  late MenuItem _item;
  late final Map<String, String> _selections;
  late int _quantity;
  late final TextEditingController _kitchenNoteController;
  bool _submitting = false;

  late final AnimationController _flyController;
  late final Animation<double> _scrimFade;
  late final Animation<double> _cardScale;
  late final Animation<double> _cardFade;
  late final Animation<double> _circlePop;
  late final Animation<double> _circleScale;
  late final Animation<double> _circleFade;
  late final Animation<double> _flightProgress;

  @override
  void initState() {
    super.initState();
    _item = widget.item;
    _quantity = widget.editing?.quantity ?? 1;
    _kitchenNoteController = TextEditingController(
      text: widget.editing?.kitchenNote ?? '',
    );

    _selections = {
      for (final g in _item.modifierGroups)
        g.id: widget.editing?.selections[g.id] ?? g.defaultOptionId,
    };

    _loadAdditionalModifiersIfNeeded();

    _flyController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 480),
    );

    // 1. Scrim dissolves quickly (0% -> 28%)
    _scrimFade = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _flyController,
        curve: const Interval(0.0, 0.28, curve: Curves.easeOut),
      ),
    );

    // 2. Main dialog card shrinks down toward center (0% -> 24%)
    _cardScale = Tween<double>(begin: 1.0, end: 0.12).animate(
      CurvedAnimation(
        parent: _flyController,
        curve: const Interval(0.0, 0.24, curve: Curves.easeInBack),
      ),
    );

    // 3. Main dialog card fades out as it implodes (0% -> 20%)
    _cardFade = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _flyController,
        curve: const Interval(0.0, 0.20, curve: Curves.easeIn),
      ),
    );

    // 4. Circle badge pops out right at center as the card collapses (8% -> 26%)
    _circlePop = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _flyController,
        curve: const Interval(0.08, 0.26, curve: Curves.easeOutBack),
      ),
    );

    // 5. Circle's parabolic flight progression across the screen (20% -> 92%)
    _flightProgress = CurvedAnimation(
      parent: _flyController,
      curve: const Interval(0.20, 0.92, curve: Curves.easeInOutCubic),
    );

    // 6. Circle shrinks down and absorbs into the cart icon (86% -> 100%)
    _circleScale = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _flyController,
        curve: const Interval(0.86, 1.0, curve: Curves.easeInBack),
      ),
    );

    // 7. Circle fades out on impact (90% -> 100%)
    _circleFade = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _flyController,
        curve: const Interval(0.90, 1.0, curve: Curves.easeIn),
      ),
    );
  }

  Future<void> _loadAdditionalModifiersIfNeeded() async {
    // If the item has no modifier groups, attempt to load add-ons from repository.
    if (_item.modifierGroups.isEmpty) {
      try {
        final addOns = await ref
            .read(menuItemModifierRepositoryProvider)
            .getForMenuItem(_item.id);
        if (mounted && addOns.isNotEmpty) {
          setState(() {
            _item = _item.withModifierGroups(addOns);
            for (final g in addOns) {
              _selections[g.id] =
                  widget.editing?.selections[g.id] ?? g.defaultOptionId;
            }
          });
        }
      } catch (_) {
        // Mock / offline fallback: keep existing groups
      }
    }
  }

  @override
  void dispose() {
    _flyController.dispose();
    _kitchenNoteController.dispose();
    super.dispose();
  }

  int get _basePriceCentavos => _item.priceFor(widget.channel);

  int get _modifiersDeltaCentavos {
    var sum = 0;
    for (final g in _item.modifierGroups) {
      final selectedId = _selections[g.id] ?? g.defaultOptionId;
      sum += g.optionById(selectedId).priceDeltaCentavos;
    }
    return sum;
  }

  int get _unitPriceCentavos => _basePriceCentavos + _modifiersDeltaCentavos;

  int get _totalPriceCentavos => _unitPriceCentavos * _quantity;

  void _submit() {
    if (_submitting) return;
    _submitting = true;

    HapticFeedback.mediumImpact();

    final note = _kitchenNoteController.text.trim();
    final noteOrNull = note.isEmpty ? null : note;

    _flyController.forward().then((_) {
      if (!mounted) return;

      final cartNotifier = ref.read(cartProvider.notifier);
      if (widget.editing == null) {
        cartNotifier.addConfigured(
          _item,
          Map<String, String>.from(_selections),
          _quantity,
          kitchenNote: noteOrNull,
        );
      } else {
        cartNotifier.updateLine(
          widget.editing!.id,
          Map<String, String>.from(_selections),
          _quantity,
          item: _item,
          kitchenNote: noteOrNull,
        );
      }

      HapticFeedback.lightImpact();
      Navigator.of(context).pop(true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final screenSize = mediaQuery.size;
    final isWide = screenSize.width >= 850.0;
    final isEditing = widget.editing != null;

    final singleChoiceGroups = _item.modifierGroups
        .where((g) => !g.isAddOn)
        .toList();
    final addOnGroups = _item.modifierGroups.where((g) => g.isAddOn).toList();

    // Flight target coordinates relative to dialog center
    final double targetDx;
    final double targetDy;

    if (isWide) {
      // Land right inside the docked right CartPanel header cart icon
      targetDx = (screenSize.width * 0.5) - 340.0;
      targetDy = 94.0 - (screenSize.height * 0.5);
    } else {
      // Fly directly to the floating CartBar at the bottom
      final bottomInset = mediaQuery.padding.bottom;
      targetDx = 0.0;
      targetDy = (screenSize.height * 0.5) - bottomInset - 44.0;
    }

    return AnimatedBuilder(
      animation: _flyController,
      builder: (context, _) {
        final flightVal = _flightProgress.value;
        final arcOffset =
            math.sin(flightVal * math.pi) * (isWide ? 52.0 : 28.0);
        final currentDx = targetDx * flightVal;
        final currentDy = (targetDy * flightVal) - arcOffset;
        final rotation = isWide ? (0.28 * math.sin(flightVal * math.pi)) : 0.0;

        return Stack(
          children: [
            // Internal dismissible dark scrim that dissolves away as the card collapses
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  if (!_submitting) Navigator.of(context).pop(false);
                },
                child: FadeTransition(
                  opacity: _scrimFade,
                  child: Container(color: Colors.black.withValues(alpha: 0.5)),
                ),
              ),
            ),

            // The dialog card that collapses at center
            if (_cardFade.value > 0.001)
              Center(
                child: IgnorePointer(
                  ignoring: _submitting,
                  child: Transform.scale(
                    scale: _cardScale.value,
                    child: FadeTransition(
                      opacity: _cardFade,
                      child: Dialog(
                        backgroundColor: Colors.transparent,
                        elevation: 0,
                        insetPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 24,
                        ),
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            maxWidth: 420,
                            maxHeight: mediaQuery.size.height * 0.92,
                          ),
                          child: Container(
                            decoration: BoxDecoration(
                              color: KkfcColors.surface,
                              borderRadius: BorderRadius.circular(16.0),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(
                                    alpha: 0.18 * _cardFade.value,
                                  ),
                                  blurRadius: 28,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                // Header
                                Container(
                                  color: KkfcColors.surface,
                                  padding: const EdgeInsets.fromLTRB(
                                    20,
                                    18,
                                    16,
                                    16,
                                  ),
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              _item.name,
                                              style: const TextStyle(
                                                fontFamily:
                                                    KkfcFonts.ibmPlexSans,
                                                fontSize: 18.0,
                                                fontWeight: FontWeight.w700,
                                                color: KkfcColors.ink,
                                                height: 1.25,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '${widget.brandName} · ${widget.channel.label} price · ${formatPeso(_basePriceCentavos)}',
                                              style: const TextStyle(
                                                fontFamily: KkfcFonts.text,
                                                fontSize: 13.0,
                                                color: KkfcColors.ink3,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Container(
                                        width: 38,
                                        height: 38,
                                        decoration: BoxDecoration(
                                          color: KkfcColors.surface,
                                          borderRadius: BorderRadius.circular(
                                            8.0,
                                          ),
                                          border: Border.all(
                                            color: KkfcColors.border,
                                          ),
                                        ),
                                        child: Material(
                                          color: Colors.transparent,
                                          child: InkWell(
                                            borderRadius: BorderRadius.circular(
                                              8.0,
                                            ),
                                            onTap: () =>
                                                Navigator.of(context)
                                                    .pop(false),
                                            child: const Center(
                                              child: Icon(
                                                Icons.close,
                                                size: 18,
                                                color: KkfcColors.ink,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const Divider(
                                  height: 1,
                                  thickness: 1,
                                  color: KkfcColors.divider,
                                ),

                                // Scrollable Body
                                Flexible(
                                  child: Container(
                                    color: KkfcColors
                                        .canvas, // Warm Sand canvas ground
                                    child: SingleChildScrollView(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 20,
                                        vertical: 16,
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          // Description
                                          if (_item.description.isNotEmpty) ...[
                                            Text(
                                              _item.description,
                                              style: const TextStyle(
                                                fontFamily: KkfcFonts.text,
                                                fontSize: 13.5,
                                                height: 1.4,
                                                color: KkfcColors.ink2,
                                              ),
                                            ),
                                            const SizedBox(height: 18),
                                          ],

                                          // Radio modifier groups (single-choice)
                                          for (final group
                                              in singleChoiceGroups) ...[
                                            Row(
                                              children: [
                                                Text(
                                                  group.title,
                                                  style: const TextStyle(
                                                    fontFamily:
                                                        KkfcFonts.ibmPlexSans,
                                                    fontSize: 16.0,
                                                    fontWeight: FontWeight.w700,
                                                    color: KkfcColors.ink,
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 3,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: KkfcColors.successBg,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          12,
                                                        ),
                                                    border: Border.all(
                                                      color: KkfcColors
                                                          .successBorder,
                                                      width: 1.0,
                                                    ),
                                                  ),
                                                  child: const Row(
                                                    mainAxisSize:
                                                        MainAxisSize.min,
                                                    children: [
                                                      Icon(
                                                        Icons.check,
                                                        size: 12,
                                                        color:
                                                            KkfcColors.success,
                                                      ),
                                                      SizedBox(width: 3),
                                                      Text(
                                                        'Chosen',
                                                        style: TextStyle(
                                                          fontFamily: KkfcFonts
                                                              .ibmPlexSans,
                                                          fontSize: 11.0,
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          color: KkfcColors
                                                              .success,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 10),
                                            for (final option
                                                in group.options) ...[
                                              _RadioOptionTile(
                                                label: option.label,
                                                priceDeltaCentavos:
                                                    option.priceDeltaCentavos,
                                                isSelected:
                                                    _selections[group.id] ==
                                                    option.id,
                                                onTap: () {
                                                  HapticFeedback.selectionClick();
                                                  setState(() {
                                                    _selections[group.id] =
                                                        option.id;
                                                  });
                                                },
                                              ),
                                              const SizedBox(height: 8),
                                            ],
                                            const SizedBox(height: 10),
                                          ],

                                          // Add-Ons group (checkboxes)
                                          if (addOnGroups.isNotEmpty) ...[
                                            Row(
                                              children: [
                                                const Text(
                                                  'Add-Ons',
                                                  style: TextStyle(
                                                    fontFamily:
                                                        KkfcFonts.ibmPlexSans,
                                                    fontSize: 16.0,
                                                    fontWeight: FontWeight.w700,
                                                    color: KkfcColors.ink,
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 3,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: KkfcColors.neutralBg,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          12,
                                                        ),
                                                    border: Border.all(
                                                      color: KkfcColors
                                                          .neutralBorder,
                                                      width: 1.0,
                                                    ),
                                                  ),
                                                  child: const Text(
                                                    'Optional',
                                                    style: TextStyle(
                                                      fontFamily:
                                                          KkfcFonts.text,
                                                      fontSize: 11.0,
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      color: KkfcColors
                                                          .neutralSolid,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 10),
                                            for (final addOn
                                                in addOnGroups) ...[
                                              Builder(
                                                builder: (context) {
                                                  final isChecked =
                                                      _selections[addOn.id] ==
                                                      ModifierGroup.addOnOn;
                                                  final onOption = addOn.options
                                                      .firstWhere(
                                                        (o) =>
                                                            o.id ==
                                                            ModifierGroup
                                                                .addOnOn,
                                                        orElse: () =>
                                                            addOn.options.last,
                                                      );

                                                  return Padding(
                                                    padding:
                                                        const EdgeInsets.only(
                                                          bottom: 8.0,
                                                        ),
                                                    child: _CheckboxOptionTile(
                                                      label: addOn.title,
                                                      priceDeltaCentavos: onOption
                                                          .priceDeltaCentavos,
                                                      isChecked: isChecked,
                                                      onTap: () {
                                                        HapticFeedback.selectionClick();
                                                        setState(() {
                                                          _selections[addOn
                                                              .id] = isChecked
                                                              ? ModifierGroup
                                                                    .addOnOff
                                                              : ModifierGroup
                                                                    .addOnOn;
                                                        });
                                                      },
                                                    ),
                                                  );
                                                },
                                              ),
                                            ],
                                            const SizedBox(height: 10),
                                          ],

                                          // Quantity Stepper
                                          Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              const Text(
                                                'Quantity',
                                                style: TextStyle(
                                                  fontFamily:
                                                      KkfcFonts.ibmPlexSans,
                                                  fontSize: 15.0,
                                                  fontWeight: FontWeight.w700,
                                                  color: KkfcColors.ink,
                                                ),
                                              ),
                                              CustomizationQuantityStepper(
                                                quantity: _quantity,
                                                onChanged: (newQuantity) {
                                                  setState(
                                                    () =>
                                                        _quantity = newQuantity,
                                                  );
                                                },
                                              ),
                                            ],
                                          ),

                                          const SizedBox(height: 18),

                                          // Kitchen note
                                          const Row(
                                            children: [
                                              Text(
                                                'Kitchen note ',
                                                style: TextStyle(
                                                  fontFamily:
                                                      KkfcFonts.ibmPlexSans,
                                                  fontSize: 14.0,
                                                  fontWeight: FontWeight.w700,
                                                  color: KkfcColors.ink,
                                                ),
                                              ),
                                              Text(
                                                '(optional)',
                                                style: TextStyle(
                                                  fontFamily: KkfcFonts.text,
                                                  fontSize: 13.0,
                                                  color: KkfcColors.ink3,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          TextField(
                                            key: const ValueKey(
                                              'customize-kitchen-note-field',
                                            ),
                                            controller: _kitchenNoteController,
                                            maxLines: 2,
                                            maxLength: 100,
                                            style: const TextStyle(
                                              fontFamily: KkfcFonts.text,
                                              fontSize: 14.0,
                                              color: KkfcColors.ink,
                                            ),
                                            decoration: InputDecoration(
                                              hintText:
                                                  'For example: no onions',
                                              hintStyle: const TextStyle(
                                                fontFamily: KkfcFonts.text,
                                                fontSize: 14.0,
                                                color: KkfcColors.borderStrong,
                                              ),
                                              filled: true,
                                              fillColor: KkfcColors.surface,
                                              isDense: true,
                                              counterText: '',
                                              contentPadding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 12,
                                                    vertical: 10,
                                                  ),
                                              border: OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8.0),
                                                borderSide: const BorderSide(
                                                  color:
                                                      KkfcColors.borderStrong,
                                                  width: 1.0,
                                                ),
                                              ),
                                              enabledBorder: OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8.0),
                                                borderSide: const BorderSide(
                                                  color:
                                                      KkfcColors.borderStrong,
                                                  width: 1.0,
                                                ),
                                              ),
                                              focusedBorder: OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8.0),
                                                borderSide: const BorderSide(
                                                  color: KkfcColors.ink,
                                                  width: 1.5,
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          const Text(
                                            'Up to 100 characters.',
                                            style: TextStyle(
                                              fontFamily: KkfcFonts.text,
                                              fontSize: 12.0,
                                              color: KkfcColors.ink3,
                                            ),
                                          ),
                                          const SizedBox(height: 10),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),

                                const Divider(
                                  height: 1,
                                  thickness: 1,
                                  color: KkfcColors.divider,
                                ),

                                // Footer: Action Button
                                Container(
                                  color: KkfcColors.surface,
                                  padding: const EdgeInsets.fromLTRB(
                                    16,
                                    12,
                                    16,
                                    16,
                                  ),
                                  child: SafeArea(
                                    top: false,
                                    child: SizedBox(
                                      height: 52,
                                      width: double.infinity,
                                      child: Material(
                                        color: KkfcColors
                                            .action, // Burnished Copper
                                        borderRadius: BorderRadius.circular(
                                          10.0,
                                        ),
                                        child: InkWell(
                                          borderRadius: BorderRadius.circular(
                                            10.0,
                                          ),
                                          onTap: _submit,
                                          child: Padding(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 20,
                                            ),
                                            child: Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Text(
                                                  isEditing
                                                      ? 'Update item'
                                                      : 'Add to order',
                                                  style: const TextStyle(
                                                    fontFamily:
                                                        KkfcFonts.ibmPlexSans,
                                                    fontSize: 16.0,
                                                    fontWeight: FontWeight.w700,
                                                    color: KkfcColors.surface,
                                                  ),
                                                ),
                                                AnimatedSwitcher(
                                                  duration: const Duration(
                                                    milliseconds: 180,
                                                  ),
                                                  transitionBuilder:
                                                      (child, animation) =>
                                                          FadeTransition(
                                                            opacity: animation,
                                                            child: child,
                                                          ),
                                                  child: Text(
                                                    formatPeso(
                                                      _totalPriceCentavos,
                                                    ),
                                                    key: ValueKey(
                                                      'dialog-total-$_totalPriceCentavos',
                                                    ),
                                                    style: const TextStyle(
                                                      fontFamily:
                                                          KkfcFonts.ibmPlexSans,
                                                      fontSize: 16.0,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      color: KkfcColors.surface,
                                                      fontFeatures: [
                                                        FontFeature.tabularFigures(),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),

            // The small circle token that emerges from center and flies over to the cart
            if (_circlePop.value > 0.001 && _circleFade.value > 0.001)
              Center(
                child: IgnorePointer(
                  child: Transform.translate(
                    offset: Offset(currentDx, currentDy),
                    child: Transform.rotate(
                      angle: rotation,
                      child: Transform.scale(
                        scale: _circlePop.value * _circleScale.value,
                        child: Opacity(
                          opacity: _circleFade.value.clamp(0.0, 1.0),
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: KkfcColors.action, // Burnished copper
                              boxShadow: [
                                BoxShadow(
                                  color: KkfcColors.ink.withValues(alpha: 0.25),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                                BoxShadow(
                                  color: KkfcColors.action.withValues(
                                    alpha: 0.40,
                                  ),
                                  blurRadius: 6,
                                  offset: const Offset(0, 1),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _RadioOptionTile extends StatelessWidget {
  const _RadioOptionTile({
    required this.label,
    required this.priceDeltaCentavos,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final int priceDeltaCentavos;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(8.0),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: isSelected ? KkfcColors.selectedTint : KkfcColors.surface,
            borderRadius: BorderRadius.circular(8.0),
            border: Border.all(
              color: isSelected ? KkfcColors.ink : KkfcColors.borderStrong,
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: Row(
            children: [
              // Custom radio circle
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected
                        ? KkfcColors.ink
                        : KkfcColors.borderStrong,
                    width: isSelected ? 2.0 : 1.5,
                  ),
                  color: KkfcColors.surface,
                ),
                child: isSelected
                    ? Center(
                        child: Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: KkfcColors.ink,
                          ),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontFamily: KkfcFonts.text,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                    color: KkfcColors.ink,
                  ),
                ),
              ),
              if (priceDeltaCentavos > 0)
                Text(
                  '+${formatPeso(priceDeltaCentavos)}',
                  style: const TextStyle(
                    fontFamily: KkfcFonts.mono,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: KkfcColors.ink2,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CheckboxOptionTile extends StatelessWidget {
  const _CheckboxOptionTile({
    required this.label,
    required this.priceDeltaCentavos,
    required this.isChecked,
    required this.onTap,
  });

  final String label;
  final int priceDeltaCentavos;
  final bool isChecked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(8.0),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: isChecked ? KkfcColors.selectedTint : KkfcColors.surface,
            borderRadius: BorderRadius.circular(8.0),
            border: Border.all(
              color: isChecked ? KkfcColors.ink : KkfcColors.borderStrong,
              width: isChecked ? 1.5 : 1.0,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4.0),
                  border: Border.all(
                    color: isChecked ? KkfcColors.ink : KkfcColors.borderStrong,
                    width: isChecked ? 2.0 : 1.5,
                  ),
                  color: isChecked ? KkfcColors.ink : KkfcColors.surface,
                ),
                child: isChecked
                    ? const Center(
                        child: Icon(
                          Icons.check,
                          size: 14,
                          color: KkfcColors.surface,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontFamily: KkfcFonts.text,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w500,
                    color: KkfcColors.ink,
                  ),
                ),
              ),
              if (priceDeltaCentavos > 0)
                Text(
                  '+${formatPeso(priceDeltaCentavos)}',
                  style: const TextStyle(
                    fontFamily: KkfcFonts.mono,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: KkfcColors.ink2,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
