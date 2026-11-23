import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/app/routes.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/customize_flow.dart';
import 'package:mobile/features/new_order/presentation/widgets/brands/brand_logo.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

/// Opens the CartPanel as an impeccable slide-up bottom sheet on phone layouts.
Future<void> showCartPanelSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withValues(alpha: 0.45),
    sheetAnimationStyle: const AnimationStyle(
      duration: Duration(milliseconds: 320),
      reverseDuration: Duration(milliseconds: 240),
    ),
    builder: (context) => const CartPanel(isSheet: true),
  );
}

/// "Current order" panel for tablet and desktop views, or slide-up sheet on phones.
class CartPanel extends ConsumerStatefulWidget {
  const CartPanel({super.key, this.isSheet = false, this.onClose});

  final bool isSheet;
  final VoidCallback? onClose;

  @override
  ConsumerState<CartPanel> createState() => _CartPanelState();
}

class _CartPanelState extends ConsumerState<CartPanel>
    with SingleTickerProviderStateMixin {
  bool _clearPressed = false;
  bool _continuePressed = false;
  late final AnimationController _bumpController;
  late final Animation<double> _bumpAnimation;

  @override
  void initState() {
    super.initState();
    _bumpController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
    _bumpAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.0, end: 1.25)
            .chain(CurveTween(curve: Curves.easeOutBack)),
        weight: 40,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.25, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 60,
      ),
    ]).animate(_bumpController);
  }

  @override
  void dispose() {
    _bumpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(cartCountProvider, (previous, next) {
      if (next > (previous ?? 0)) {
        _bumpController.forward(from: 0.0);
      }
    });

    final lines = ref.watch(cartProvider);
    final channel = ref.watch(menuChannelProvider);
    final total = ref.watch(cartTotalProvider);
    final count = ref.watch(cartCountProvider);
    final assignedBrands = ref.watch(assignedBrandsProvider);
    final brandGroups = groupCartLinesByBrand(lines);

    final maxHeight = widget.isSheet
        ? MediaQuery.sizeOf(context).height * 0.88
        : double.infinity;

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: BoxDecoration(
        color: KkfcColors.surface,
        borderRadius: widget.isSheet
            ? const BorderRadius.vertical(top: Radius.circular(20.0))
            : BorderRadius.zero,
        border: widget.isSheet
            ? null
            : const Border(
                left: BorderSide(color: KkfcColors.divider, width: 1.0),
              ),
        boxShadow: widget.isSheet
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 20,
                  offset: const Offset(0, -4),
                ),
              ]
            : null,
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag handle when presented as slide-up sheet
              if (widget.isSheet)
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 10.0, bottom: 4.0),
                    width: 38.0,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: KkfcColors.border,
                      borderRadius: BorderRadius.circular(2.5),
                    ),
                  ),
                ),

              // Header
              Padding(
                padding: EdgeInsets.fromLTRB(
                  20,
                  widget.isSheet ? 10 : 20,
                  widget.isSheet ? 12 : 20,
                  16,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              ScaleTransition(
                                scale: _bumpAnimation,
                                child: const Icon(
                                  Icons.shopping_cart_outlined,
                                  size: 20.0,
                                  color: KkfcColors.ink,
                                ),
                              ),
                              const SizedBox(width: KkfcSpace.space2),
                              const Flexible(
                                child: Text(
                                  'Current order',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: KkfcFonts.ibmPlexSans,
                                    fontSize: 18.0,
                                    fontWeight: FontWeight.w700,
                                    color: KkfcColors.ink,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 200),
                            child: Text(
                              lines.isEmpty
                                  ? channel.label
                                  : '${lines.length} line${lines.length == 1 ? '' : 's'} · $count item${count == 1 ? '' : 's'} · ${channel.label}',
                              key: ValueKey(
                                'cart-header-subtitle-${lines.length}-$count-${channel.label}',
                              ),
                              style: const TextStyle(
                                fontSize: 13.0,
                                color: KkfcColors.ink3,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (lines.isNotEmpty)
                      AnimatedScale(
                        scale: _clearPressed ? 0.94 : 1.0,
                        duration: const Duration(milliseconds: 90),
                        curve: Curves.easeOut,
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(8.0),
                            onTapDown: (_) =>
                                setState(() => _clearPressed = true),
                            onTapCancel: () =>
                                setState(() => _clearPressed = false),
                            onTapUp: (_) =>
                                setState(() => _clearPressed = false),
                            onTap: () {
                              ref.read(cartProvider.notifier).clear();
                            },
                            child: Ink(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: KkfcColors.surface,
                                borderRadius: BorderRadius.circular(8.0),
                                border: Border.all(
                                  color: KkfcColors.dangerBorder,
                                  width: 1.0,
                                ),
                              ),
                              child: const Text(
                                'Clear',
                                style: TextStyle(
                                  fontFamily: KkfcFonts.ibmPlexSans,
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.w600,
                                  color: KkfcColors.danger,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    if (widget.isSheet) ...[
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(
                          Icons.close_rounded,
                          size: 22,
                          color: KkfcColors.ink3,
                        ),
                        tooltip: 'Close cart',
                        onPressed: () {
                          if (widget.onClose != null) {
                            widget.onClose!();
                          } else {
                            Navigator.of(context).maybePop();
                          }
                        },
                      ),
                    ],
                  ],
                ),
              ),
              const Divider(height: 1, color: KkfcColors.divider),

              // Empty state or Items
              if (lines.isEmpty)
                Center(
                  key: const ValueKey('empty-cart'),
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.shopping_cart_outlined,
                          size: 44,
                          color: KkfcColors.borderStrong,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'No items yet. Choose an item from the\nmenu.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 15.0,
                            height: 1.4,
                            color: KkfcColors.ink3,
                          ),
                        ),
                        if (widget.isSheet) ...[
                          const SizedBox(height: 18),
                          OutlinedButton(
                            onPressed: () {
                              if (widget.onClose != null) {
                                widget.onClose!();
                              } else {
                                Navigator.of(context).maybePop();
                              }
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: KkfcColors.ink,
                              side: const BorderSide(color: KkfcColors.ticketDisabledBg),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8.0),
                              ),
                            ),
                            child: const Text('Return to menu'),
                          ),
                        ],
                      ],
                    ),
                  ),
                )
              else ...[
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    children: [
                      for (final group in brandGroups)
                        _buildBrandGroupCard(
                          context,
                          ref,
                          group: group,
                          channel: channel,
                          assignedBrands: assignedBrands,
                        ),
                    ],
                  ),
                ),

                // Footer (Subtotal, Total, Continue button)
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Divider(height: 1, color: KkfcColors.divider),
                    Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  'Subtotal',
                                  style: TextStyle(
                                    fontSize: 14.0,
                                    color: KkfcColors.ink3,
                                  ),
                                ),
                              ),
                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 200),
                                transitionBuilder: (child, animation) {
                                  return SlideTransition(
                                    position: Tween<Offset>(
                                      begin: const Offset(0, 0.25),
                                      end: Offset.zero,
                                    ).animate(animation),
                                    child: FadeTransition(
                                      opacity: animation,
                                      child: child,
                                    ),
                                  );
                                },
                                child: Text(
                                  formatPeso(total),
                                  key: ValueKey('cart-subtotal-$total'),
                                  style: const TextStyle(
                                    fontFamily: KkfcFonts.ibmPlexSans,
                                    fontSize: 14.0,
                                    fontWeight: FontWeight.w600,
                                    color: KkfcColors.ink,
                                    fontFeatures: [
                                      FontFeature.tabularFigures(),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  'Total',
                                  style: TextStyle(
                                    fontFamily: KkfcFonts.ibmPlexSans,
                                    fontSize: 18.0,
                                    fontWeight: FontWeight.w700,
                                    color: KkfcColors.ink,
                                  ),
                                ),
                              ),
                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 200),
                                transitionBuilder: (child, animation) {
                                  return SlideTransition(
                                    position: Tween<Offset>(
                                      begin: const Offset(0, 0.25),
                                      end: Offset.zero,
                                    ).animate(animation),
                                    child: FadeTransition(
                                      opacity: animation,
                                      child: child,
                                    ),
                                  );
                                },
                                child: Text(
                                  formatPeso(total),
                                  key: ValueKey('cart-total-$total'),
                                  style: const TextStyle(
                                    fontFamily: KkfcFonts.ibmPlexSans,
                                    fontSize: 18.0,
                                    fontWeight: FontWeight.w700,
                                    color: KkfcColors.ink,
                                    fontFeatures: [
                                      FontFeature.tabularFigures(),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Listener(
                            onPointerDown: (_) =>
                                setState(() => _continuePressed = true),
                            onPointerUp: (_) =>
                                setState(() => _continuePressed = false),
                            onPointerCancel: (_) =>
                                setState(() => _continuePressed = false),
                            child: AnimatedScale(
                              scale: _continuePressed
                                  ? KkfcMotion.pressScale
                                  : 1.0,
                              duration: KkfcMotion.durPress,
                              curve: Curves.easeOut,
                              child: SizedBox(
                                width: double.infinity,
                                height: 50.0,
                                child: FilledButton(
                                  style: FilledButton.styleFrom(
                                    backgroundColor: KkfcColors.action, // Burnished copper
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10.0),
                                    ),
                                  ),
                                  onPressed: () {
                                    if (widget.isSheet) {
                                      Navigator.of(context).pop();
                                    }
                                    context.push(
                                      AppRoutes.mobileOrderFlow,
                                      extra: {'initialStep': 3},
                                    );
                                  },
                                  child: const Text(
                                    'Continue to order details',
                                    style: TextStyle(
                                      fontFamily: KkfcFonts.ibmPlexSans,
                                      fontSize: 16.0,
                                      fontWeight: FontWeight.w700,
                                      color: KkfcColors.surface,
                                    ),
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
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrandGroupCard(
    BuildContext context,
    WidgetRef ref, {
    required BrandCartGroup group,
    required MenuChannel channel,
    required List<AssignedBrand> assignedBrands,
  }) {
    final asset = _resolveBrandLogoAsset(
      brandId: group.brandId,
      brandName: group.brandName,
      assignedBrands: assignedBrands,
    );
    final groupSubtotal = group.totalCentavos(channel);

    return Container(
      key: ValueKey(
        'cart-brand-group-${group.brandId.isNotEmpty ? group.brandId : group.brandName}',
      ),
      margin: const EdgeInsets.fromLTRB(16.0, 4.0, 16.0, 10.0),
      decoration: BoxDecoration(
        color: KkfcColors.surface,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: KkfcColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4.0,
            offset: const Offset(0, 1.0),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Brand Header Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
            decoration: const BoxDecoration(
              color: KkfcColors.canvas, // Warm Sand ground
              border: Border(
                bottom: BorderSide(color: KkfcColors.divider, width: 1.0),
              ),
            ),
            child: Row(
              children: [
                // Brand logo or brand avatar
                if (asset != null)
                  Image.asset(
                    asset,
                    height: 20.0,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) =>
                        _BrandIconAvatar(brandName: group.brandName),
                  )
                else
                  _BrandIconAvatar(brandName: group.brandName),
                const SizedBox(width: 8.0),

                // Brand name & Item count
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        group.brandName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: 14.0,
                          fontWeight: FontWeight.w700,
                          color: KkfcColors.ink,
                        ),
                      ),
                      const SizedBox(height: 1.0),
                      Text(
                        '${group.totalQuantity} item${group.totalQuantity == 1 ? '' : 's'}',
                        style: const TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                          color: KkfcColors.ink3,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8.0),

                // Brand subtotal
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  transitionBuilder: (child, animation) => SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0, 0.2),
                      end: Offset.zero,
                    ).animate(animation),
                    child: FadeTransition(opacity: animation, child: child),
                  ),
                  child: Text(
                    formatPeso(groupSubtotal),
                    key: ValueKey(
                      'brand-subtotal-${group.brandId}-$groupSubtotal',
                    ),
                    style: const TextStyle(
                      fontFamily: KkfcFonts.ibmPlexSans,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: KkfcColors.ink,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Lines in this brand group
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Column(
              children: [
                for (var i = 0; i < group.lines.length; i++) ...[
                  if (i > 0)
                    const Divider(height: 20.0, color: KkfcColors.divider),
                  _buildLineTile(
                    context,
                    ref,
                    line: group.lines[i],
                    channel: channel,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLineTile(
    BuildContext context,
    WidgetRef ref, {
    required CartLine line,
    required MenuChannel channel,
  }) {
    final modifiers = line.modifierSummary;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Line title and line total
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  line.item.name,
                  style: const TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 15.0,
                    fontWeight: FontWeight.w700,
                    color: KkfcColors.ink,
                  ),
                ),
              ),
              const SizedBox(width: 8.0),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                transitionBuilder: (child, animation) {
                  return SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0, 0.2),
                      end: Offset.zero,
                    ).animate(animation),
                    child: FadeTransition(
                      opacity: animation,
                      child: child,
                    ),
                  );
                },
                child: Text(
                  formatPeso(line.totalCentavos(channel)),
                  key: ValueKey(
                    'line-total-${line.id}-${line.totalCentavos(channel)}',
                  ),
                  style: const TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 15.0,
                    fontWeight: FontWeight.w700,
                    color: KkfcColors.ink,
                    fontFeatures: [
                      FontFeature.tabularFigures(),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 3.0),

          // Unit price
          Text(
            '${formatPeso(line.unitCentavos(channel))} each',
            style: const TextStyle(
              fontSize: 12.0,
              color: KkfcColors.ink3,
              fontFeatures: [
                FontFeature.tabularFigures(),
              ],
            ),
          ),

          // Modifiers summary
          if (modifiers.isNotEmpty) ...[
            const SizedBox(height: 4.0),
            Text(
              modifiers.join(' · '),
              style: const TextStyle(
                fontSize: 12.0,
                color: KkfcColors.ink3,
              ),
            ),
          ],

          // Kitchen note
          if (line.kitchenNote != null && line.kitchenNote!.isNotEmpty) ...[
            const SizedBox(height: 5.0),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 8.0,
                vertical: 2.5,
              ),
              decoration: BoxDecoration(
                color: KkfcColors.ticketNoteBg,
                borderRadius: BorderRadius.circular(4.0),
                border: Border.all(
                  color: KkfcColors.ticketNoteBorder,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.edit_note,
                    size: 14.0,
                    color: KkfcColors.warning,
                  ),
                  const SizedBox(width: 4.0),
                  Flexible(
                    child: Text(
                      line.kitchenNote!,
                      style: const TextStyle(
                        fontStyle: FontStyle.italic,
                        fontSize: 11.5,
                        color: KkfcColors.warning,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10.0),

          // Controls: [-] [qty] [+] [Edit] [Remove]
          Wrap(
            spacing: 8.0,
            runSpacing: 8.0,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Stepper: -
                  _QtyButton(
                    icon: Icons.remove,
                    onTap: () => ref
                        .read(cartProvider.notifier)
                        .decrementLine(line.id),
                  ),
                  SizedBox(
                    width: 32.0,
                    child: Center(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 180),
                        transitionBuilder: (child, animation) {
                          return ScaleTransition(
                            scale: animation,
                            child: FadeTransition(
                              opacity: animation,
                              child: child,
                            ),
                          );
                        },
                        child: Text(
                          '${line.quantity}',
                          key: ValueKey('qty-${line.id}-${line.quantity}'),
                          style: const TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: 15.0,
                            fontWeight: FontWeight.w700,
                            color: KkfcColors.ink,
                            fontFeatures: [
                              FontFeature.tabularFigures(),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Stepper: +
                  _QtyButton(
                    icon: Icons.add,
                    onTap: () => ref
                        .read(cartProvider.notifier)
                        .incrementLine(line.id),
                  ),
                  const SizedBox(width: 8.0),

                  // Edit button
                  _EditButton(
                    onTap: () => openCustomize(
                      context,
                      ref,
                      item: line.item,
                      editing: line,
                    ),
                  ),
                ],
              ),

              // Remove button
              TextButton(
                onPressed: () => ref
                    .read(cartProvider.notifier)
                    .removeLine(line.id),
                style: TextButton.styleFrom(
                  foregroundColor: KkfcColors.danger,
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'Remove',
                  style: TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 13.0,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String? _resolveBrandLogoAsset({
  required String brandId,
  required String brandName,
  required List<AssignedBrand> assignedBrands,
}) {
  final assigned = assignedBrands.where((b) {
    if (brandId.isNotEmpty && b.id == brandId) return true;
    if (brandName.isNotEmpty &&
        b.name.trim().toLowerCase() == brandName.trim().toLowerCase()) {
      return true;
    }
    return false;
  }).firstOrNull;

  if (assigned != null) {
    final asset = BrandLogo.assetFor(assigned.code);
    if (asset != null) return asset;
  }

  final lower = '$brandId $brandName'.toLowerCase();
  if (lower.contains('gamcheon') || lower == 'gc') {
    return BrandLogo.assetFor('GC');
  }
  if (lower.contains('aurelia') || lower.contains('inasal') || lower == 'ai') {
    return BrandLogo.assetFor('AI');
  }
  if (lower.contains('king') ||
      lower.contains('kafe') ||
      lower.contains('cafe') ||
      lower == 'kk') {
    return BrandLogo.assetFor('KK');
  }

  return null;
}

class _BrandIconAvatar extends StatelessWidget {
  const _BrandIconAvatar({required this.brandName});

  final String brandName;

  @override
  Widget build(BuildContext context) {
    final initial = brandName.trim().isNotEmpty
        ? brandName.trim().substring(0, 1).toUpperCase()
        : '';

    return Container(
      width: 20.0,
      height: 20.0,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: KkfcColors.neutralBg,
        borderRadius: BorderRadius.circular(5.0),
        border: Border.all(color: KkfcColors.neutralBorder, width: 0.8),
      ),
      child: initial.isNotEmpty
          ? Text(
              initial,
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: 11.0,
                fontWeight: FontWeight.w700,
                color: KkfcColors.ink2,
                height: 1.1,
              ),
            )
          : const Icon(
              Icons.storefront_outlined,
              size: 13.0,
              color: KkfcColors.ink2,
            ),
    );
  }
}

class _EditButton extends StatefulWidget {
  const _EditButton({required this.onTap});

  final VoidCallback onTap;

  @override
  State<_EditButton> createState() => _EditButtonState();
}

class _EditButtonState extends State<_EditButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: _pressed ? 0.94 : 1.0,
      duration: const Duration(milliseconds: 90),
      curve: Curves.easeOut,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8.0),
          onTapDown: (_) => setState(() => _pressed = true),
          onTapCancel: () => setState(() => _pressed = false),
          onTapUp: (_) => setState(() => _pressed = false),
          onTap: widget.onTap,
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: _pressed ? KkfcColors.canvasSunken : KkfcColors.surface,
              borderRadius: BorderRadius.circular(8.0),
              border: Border.all(
                color: _pressed
                    ? KkfcColors.ink
                    : KkfcColors.borderStrong,
                width: 1.0,
              ),
            ),
            child: const Text(
              'Edit',
              style: TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: 13.0,
                fontWeight: FontWeight.w600,
                color: KkfcColors.ink,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _QtyButton extends StatefulWidget {
  const _QtyButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  State<_QtyButton> createState() => _QtyButtonState();
}

class _QtyButtonState extends State<_QtyButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: _pressed ? 0.90 : 1.0,
      duration: const Duration(milliseconds: 90),
      curve: Curves.easeOut,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(6.0),
          onTapDown: (_) => setState(() => _pressed = true),
          onTapCancel: () => setState(() => _pressed = false),
          onTapUp: (_) => setState(() => _pressed = false),
          onTap: widget.onTap,
          child: Ink(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: _pressed ? KkfcColors.canvasSunken : KkfcColors.surface,
              borderRadius: BorderRadius.circular(6.0),
              border: Border.all(
                color: _pressed
                    ? KkfcColors.ink
                    : KkfcColors.borderStrong,
                width: 1.0,
              ),
            ),
            child: Icon(widget.icon, size: 16, color: KkfcColors.ink),
          ),
        ),
      ),
    );
  }
}
