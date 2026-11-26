import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/app/routes.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/data/models/order_draft_models.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/features/new_order/providers/order_draft_provider.dart';
import 'package:mobile/features/order_entry/data/repositories/order_entry_repository.dart';
import 'package:mobile/features/orders/cancel/presentation/pages/cancel_order_screen.dart';

/// Step 4: Review order details and line items before confirming.
/// Sends confirmation via POST /brands/:brandId/orders/:orderId/confirm.
class ReviewOrderStepView extends ConsumerStatefulWidget {
  const ReviewOrderStepView({
    super.key,
    required this.onConfirm,
    this.onCancelOrder,
    this.cooldownDuration = const Duration(seconds: 3),
  });

  final VoidCallback onConfirm;
  final VoidCallback? onCancelOrder;
  final Duration cooldownDuration;

  @override
  ConsumerState<ReviewOrderStepView> createState() =>
      _ReviewOrderStepViewState();
}

class _ReviewOrderStepViewState extends ConsumerState<ReviewOrderStepView>
    with SingleTickerProviderStateMixin {
  bool _isSubmitting = false;
  late final AnimationController _cooldownController;

  @override
  void initState() {
    super.initState();
    _cooldownController = AnimationController(
      vsync: this,
      duration: widget.cooldownDuration,
    );

    if (widget.cooldownDuration > Duration.zero) {
      _cooldownController.forward();
    }
  }

  @override
  void dispose() {
    _cooldownController.dispose();
    super.dispose();
  }

  bool get _isCooldownActive =>
      widget.cooldownDuration > Duration.zero &&
      !_cooldownController.isCompleted;

  String _formatModifiers(CartLine line, [String? brandName]) {
    final parts = <String>[];
    for (final g in line.item.modifierGroups) {
      final selId = line.selections[g.id] ?? g.defaultOptionId;
      if (g.isAddOn && selId != ModifierGroup.addOnOn) continue;

      final opt = g.optionById(selId);
      if (opt.priceDeltaCentavos != 0) {
        final delta = opt.priceDeltaCentavos;
        final sign = delta > 0 ? '+' : '';
        final str = (delta % 100 == 0)
            ? '₱${delta ~/ 100}'
            : formatPeso(delta.abs());
        parts.add('${opt.label} ($sign$str)');
      } else {
        parts.add(opt.label);
      }
    }

    final mods = parts.join(', ');
    if (brandName != null && brandName.isNotEmpty) {
      return mods.isNotEmpty ? '$brandName · $mods' : brandName;
    }
    return mods;
  }

  String _paymentNote(MenuChannel channel) {
    switch (channel) {
      case MenuChannel.dineIn:
        return 'Guests pay after eating. Sending does not wait for payment.';
      case MenuChannel.takeaway:
        return 'Guests pay before eating or when claiming takeaway order.';
      case MenuChannel.grabFood:
      case MenuChannel.foodpanda:
        return 'Paid through delivery platform.';
    }
  }

  String _extractErrorMessage(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        final message = data['message'];
        if (message is String && message.isNotEmpty) return message;
        if (message is List && message.isNotEmpty) {
          return message.first.toString();
        }
      }
      return 'Could not confirm order. Please check your connection and try again.';
    }
    if (error is StateError) {
      return error.message;
    }
    return 'Could not confirm order. Please try again.';
  }

  void _navigateToCancelOrder(BuildContext context) {
    final draft = ref.read(activeOrderDraftProvider);
    final displayTicketNumber = draft?.ticketNumber ?? 'T-017';
    final displayOrderCode = (draft != null && draft.orderCode.isNotEmpty)
        ? draft.orderCode
        : 'ORD-2026-1105-017';
    final realOrderId = draft?.orderId;

    final router = GoRouter.maybeOf(context);
    if (router != null) {
      final queryParams = <String, String>{
        'orderCode': displayOrderCode,
        'ticketNumber': displayTicketNumber,
      };
      if (realOrderId != null) {
        queryParams['orderId'] = realOrderId;
      }
      final uri = Uri(
        path: AppRoutes.cancelOrder,
        queryParameters: queryParams,
      );
      router.push(uri.toString());
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (ctx) => CancelOrderScreen(
            orderId: realOrderId,
            orderCode: displayOrderCode,
            ticketNumber: displayTicketNumber,
            onKeepOrder: () => Navigator.of(ctx).pop(),
            onBackToMenu: () {
              ref.read(cartProvider.notifier).clear();
              ref.read(orderReferenceProvider.notifier).clear();
              ref.read(activeOrderDraftProvider.notifier).clear();
              ref.read(clientOrderIdProvider.notifier).regenerate();
              widget.onCancelOrder?.call();
              Navigator.of(ctx).pop();
            },
          ),
        ),
      );
    }
  }

  Future<void> _onConfirmAndSend() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);
    HapticFeedback.mediumImpact();

    try {
      final draft = ref.read(activeOrderDraftProvider);
      final activeBrand = ref.read(activeBrandProvider);
      final allBrands = ref.read(assignedBrandsProvider);
      final brandId = (draft != null && draft.brandId.isNotEmpty)
          ? draft.brandId
          : resolveActiveBrandId(activeBrand, allBrands);
      final String orderId = (draft != null && draft.orderId.isNotEmpty)
          ? draft.orderId
          : ref.read(clientOrderIdProvider);
      final channel = ref.read(menuChannelProvider);

      final paymentMethod = channel.isPlatform ? 'PLATFORM_SETTLED' : 'CASH';
      final paymentStatus = channel.isPlatform ? 'PAID' : 'UNPAID';

      final confirmed = await ref
          .read(orderEntryRepositoryProvider)
          .confirmOrder(
            brandId: brandId,
            orderId: orderId,
            paymentMethod: paymentMethod,
            paymentStatus: paymentStatus,
          );

      final updatedDraft = OrderDraft.fromJson(confirmed);
      ref.read(activeOrderDraftProvider.notifier).set(updatedDraft);
      ref.read(clientOrderIdProvider.notifier).regenerate();

      if (mounted) {
        setState(() => _isSubmitting = false);
        widget.onConfirm();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        final message = _extractErrorMessage(e);
        if (e is DioException && e.response?.statusCode == 400) {
          ref.invalidate(menuItemsProvider);
        }
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: const Color(0xFFB42318),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final channel = ref.watch(menuChannelProvider);
    final reference = ref.watch(orderReferenceProvider);
    final cart = ref.watch(cartProvider);
    final total = ref.watch(cartTotalProvider);
    final itemCount = ref.watch(cartCountProvider);
    final draft = ref.watch(activeOrderDraftProvider);
    final assignedBrands = ref.watch(assignedBrandsProvider);
    final activeBrand = ref.watch(activeBrandProvider);

    final lineCount = cart.length;
    final effectiveReference = reference.isNotEmpty
        ? reference
        : (draft?.tableReference ??
              (channel == MenuChannel.dineIn ? 'Table 7' : 'Pickup'));

    final brandGroups = _groupCartLines(cart, assignedBrands, activeBrand);

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Info Banner
              Container(
                margin: const EdgeInsets.only(bottom: 14.0),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14.0,
                  vertical: 12.0,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F1FC),
                  borderRadius: BorderRadius.circular(10.0),
                  border: Border.all(
                    color: const Color(0xFFB9D7F9),
                    width: 1.0,
                  ),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: Color(0xFF19293E),
                      size: 20.0,
                    ),
                    SizedBox(width: 10.0),
                    Expanded(
                      child: Text(
                        'Not sent yet. Please review carefully before confirming.',
                        style: TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: 14.0,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF19293E),
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Card 1: Channel & Reference Meta Card
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12.0),
                  border: Border.all(
                    color: const Color(0xFFDDD6C9),
                    width: 1.0,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Channel Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Channel',
                          style: TextStyle(
                            fontFamily: KkfcFonts.text,
                            fontSize: 15.0,
                            color: Color(0xFF586579),
                          ),
                        ),
                        Text(
                          channel.label,
                          style: const TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: 15.0,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF19293E),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Table / Reference Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          channel == MenuChannel.dineIn ? 'Table' : 'Reference',
                          style: const TextStyle(
                            fontFamily: KkfcFonts.text,
                            fontSize: 15.0,
                            color: Color(0xFF586579),
                          ),
                        ),
                        Text(
                          effectiveReference,
                          style: const TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: 15.0,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF19293E),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Payment Status Row
                    Row(
                      children: [
                        const Text(
                          'Payment status ',
                          style: TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF19293E),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8.0,
                            vertical: 3.5,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEDF1F5),
                            borderRadius: BorderRadius.circular(12.0),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.info_outline,
                                size: 13.0,
                                color: Color(0xFF586579),
                              ),
                              const SizedBox(width: 4.0),
                              Text(
                                channel.isPlatform ? 'Paid' : 'Unpaid',
                                style: const TextStyle(
                                  fontFamily: KkfcFonts.ibmPlexSans,
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF19293E),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),

                    Text(
                      _paymentNote(channel),
                      style: const TextStyle(
                        fontFamily: KkfcFonts.text,
                        fontSize: 13.5,
                        color: Color(0xFF586579),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Card 2: Lines & Financial Summary
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12.0),
                  border: Border.all(
                    color: const Color(0xFFDDD6C9),
                    width: 1.0,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header: "1 line · 2 items"
                    Text(
                      '$lineCount line${lineCount == 1 ? '' : 's'} · $itemCount item${itemCount == 1 ? '' : 's'}',
                      style: const TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 16.0,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF19293E),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Order Lines Grouped by Brand
                    for (final (gIdx, group) in brandGroups.indexed) ...[
                      if (gIdx > 0) ...[
                        const SizedBox(height: 16),
                        const Divider(
                          height: 1,
                          thickness: 1,
                          color: Color(0xFFEDE8DF),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Brand Section Header Label
                      Container(
                        key: ValueKey(
                          'review-brand-group-${group.brand.code.toLowerCase()}',
                        ),
                        margin: const EdgeInsets.only(bottom: 12.0),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10.0,
                          vertical: 7.0,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F6F2),
                          borderRadius: BorderRadius.circular(8.0),
                          border: Border.all(
                            color: const Color(0xFFE2DDD5),
                            width: 1.0,
                          ),
                        ),
                        child: Row(
                          children: [
                            // Brand Code Badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6.0,
                                vertical: 2.0,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4.0),
                                border: Border.all(
                                  color: const Color(0xFFC7BFAF),
                                  width: 1.0,
                                ),
                              ),
                              child: Text(
                                group.brand.code.toUpperCase(),
                                style: const TextStyle(
                                  fontFamily: KkfcFonts.ibmPlexSans,
                                  fontSize: 11.0,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF19293E),
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8.0),

                            // Brand Name & Item Count
                            Expanded(
                              child: Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      group.brand.name,
                                      style: const TextStyle(
                                        fontFamily: KkfcFonts.ibmPlexSans,
                                        fontSize: 14.0,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF19293E),
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 6.0),
                                  Text(
                                    '(${group.totalQuantity} item${group.totalQuantity == 1 ? '' : 's'})',
                                    style: const TextStyle(
                                      fontFamily: KkfcFonts.text,
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w500,
                                      color: Color(0xFF586579),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Brand Subtotal
                            Text(
                              formatPeso(group.totalCentavos(channel)),
                              style: const TextStyle(
                                fontFamily: KkfcFonts.ibmPlexSans,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF19293E),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Items under this brand
                      for (final (i, line) in group.lines.indexed) ...[
                        if (i > 0)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Divider(
                              height: 1,
                              thickness: 1,
                              color: Color(0xFFF2ECE1),
                            ),
                          ),
                        Row(
                          key: ValueKey('review-order-line-${line.id}'),
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Quantity: "2×"
                            Text(
                              '${line.quantity}×',
                              style: const TextStyle(
                                fontFamily: KkfcFonts.ibmPlexSans,
                                fontSize: 15.0,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF19293E),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Name & Modifiers
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    line.item.name,
                                    style: const TextStyle(
                                      fontFamily: KkfcFonts.ibmPlexSans,
                                      fontSize: 15.0,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF19293E),
                                      height: 1.25,
                                    ),
                                  ),
                                  if (_formatModifiers(line).isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      _formatModifiers(line),
                                      style: const TextStyle(
                                        fontFamily: KkfcFonts.text,
                                        fontSize: 13.0,
                                        color: Color(0xFF586579),
                                        height: 1.35,
                                      ),
                                    ),
                                  ],
                                  if (line.kitchenNote != null &&
                                      line.kitchenNote!.trim().isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'Note: ${line.kitchenNote}',
                                      style: const TextStyle(
                                        fontFamily: KkfcFonts.text,
                                        fontSize: 12.5,
                                        fontStyle: FontStyle.italic,
                                        color: Color(0xFF76849A),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),

                            // Line Total
                            Text(
                              formatPeso(line.totalCentavos(channel)),
                              style: const TextStyle(
                                fontFamily: KkfcFonts.ibmPlexSans,
                                fontSize: 15.0,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF19293E),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],

                    const SizedBox(height: 18),
                    const Divider(
                      height: 1,
                      thickness: 1,
                      color: Color(0xFFEDE8DF),
                    ),
                    const SizedBox(height: 14),

                    // Subtotal Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Subtotal',
                          style: TextStyle(
                            fontFamily: KkfcFonts.text,
                            fontSize: 15.0,
                            color: Color(0xFF586579),
                          ),
                        ),
                        Text(
                          formatPeso(total),
                          style: const TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: 15.0,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF19293E),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Total Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total',
                          style: TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: 18.0,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF19293E),
                          ),
                        ),
                        Text(
                          formatPeso(total),
                          style: const TextStyle(
                            fontFamily: KkfcFonts.ibmPlexSans,
                            fontSize: 18.0,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF19293E),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Bottom Action Bar: "Confirm and send" & "Cancel order"
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: SafeArea(
            top: false,
            child: AnimatedBuilder(
              animation: _cooldownController,
              builder: (context, _) {
                final isCoolingDown = _isCooldownActive;

                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Cooldown progress loading bar
                    if (isCoolingDown) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(KkfcRadius.sm),
                        child: SizedBox(
                          height: 4.0,
                          width: double.infinity,
                          child: LinearProgressIndicator(
                            key: const ValueKey(
                              'confirm-cooldown-progress-bar',
                            ),
                            value: _cooldownController.value,
                            backgroundColor: KkfcColors.border,
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              KkfcColors.action,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8.0),
                    ],
                    SizedBox(
                      height: 52,
                      width: double.infinity,
                      child: Material(
                        color: _isSubmitting
                            ? const Color(0xFF8B4722)
                            : (isCoolingDown
                                  ? const Color(0xFFC5A28D)
                                  : const Color(0xFFA8562A)),
                        borderRadius: BorderRadius.circular(10.0),
                        child: InkWell(
                          key: const ValueKey('confirm-and-send-button'),
                          borderRadius: BorderRadius.circular(10.0),
                          onTap: (_isSubmitting || isCoolingDown)
                              ? null
                              : _onConfirmAndSend,
                          child: Center(
                            child: _isSubmitting
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.restaurant,
                                        color: isCoolingDown
                                            ? Colors.white.withValues(
                                                alpha: 0.75,
                                              )
                                            : Colors.white,
                                        size: 18.0,
                                      ),
                                      const SizedBox(width: 8.0),
                                      Text(
                                        'Confirm and send',
                                        style: TextStyle(
                                          fontFamily: KkfcFonts.ibmPlexSans,
                                          fontSize: 16.0,
                                          fontWeight: FontWeight.w700,
                                          color: isCoolingDown
                                              ? Colors.white.withValues(
                                                  alpha: 0.75,
                                                )
                                              : Colors.white,
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8.0),
                    TextButton(
                      key: const ValueKey('cancel-order-button'),
                      onPressed: _isSubmitting
                          ? null
                          : () => _navigateToCancelOrder(context),
                      child: const Text(
                        'Cancel order',
                        style: TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: 15.0,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFB42318),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _ReviewBrandGroup {
  const _ReviewBrandGroup({
    required this.brand,
    required this.lines,
  });

  final AssignedBrand brand;
  final List<CartLine> lines;

  int totalCentavos(MenuChannel channel) =>
      lines.fold(0, (sum, line) => sum + line.totalCentavos(channel));

  int get totalQuantity => lines.fold(0, (sum, line) => sum + line.quantity);
}

AssignedBrand _resolveBrandForLine(
  CartLine line,
  List<AssignedBrand> assignedBrands,
  AssignedBrand activeBrand,
) {
  // 1. Direct match by brandId
  if (line.brandId.isNotEmpty) {
    final match = assignedBrands.where((b) => b.id == line.brandId).firstOrNull;
    if (match != null) return match;
  }

  // 2. Direct match by brandName
  if (line.brandName.trim().isNotEmpty) {
    final match = assignedBrands.where((b) =>
      b.name.trim().toLowerCase() == line.brandName.trim().toLowerCase() ||
      b.code.trim().toLowerCase() == line.brandName.trim().toLowerCase(),
    ).firstOrNull;
    if (match != null) return match;
  }

  // 3. Match by item name or category
  final lower = '${line.item.name} ${line.item.category ?? ''}'.toLowerCase();
  for (final b in assignedBrands) {
    if (b.name.isNotEmpty && lower.contains(b.name.toLowerCase())) return b;
    if (b.code.isNotEmpty && lower.contains(b.code.toLowerCase())) return b;
  }

  // 4. Keyword heuristic
  if (lower.contains('gamcheon') || lower.contains('samgyup') || lower.contains('gc')) {
    final gc = assignedBrands.where((b) => b.code.toUpperCase() == 'GC').firstOrNull;
    if (gc != null) return gc;
    return const AssignedBrand(id: 'brand-gc', code: 'GC', name: 'Gamcheon');
  }
  if (lower.contains('inasal') || lower.contains('aurelia') || lower.contains('ai')) {
    final ai = assignedBrands.where((b) => b.code.toUpperCase() == 'AI').firstOrNull;
    if (ai != null) return ai;
    return const AssignedBrand(id: 'brand-ai', code: 'AI', name: "Aurelia's Inasal");
  }
  if (lower.contains('king') || lower.contains('kafe') || lower.contains('cafe') || lower.contains('kk')) {
    final kk = assignedBrands.where((b) => b.code.toUpperCase() == 'KK').firstOrNull;
    if (kk != null) return kk;
    return const AssignedBrand(id: 'brand-kk', code: 'KK', name: 'King Kafe');
  }

  // 5. Fallback to activeBrand or first assignedBrand or synthetic brand
  if (activeBrand.name.trim().isNotEmpty) {
    return activeBrand;
  }
  if (assignedBrands.isNotEmpty) {
    return assignedBrands.first;
  }
  return AssignedBrand(
    id: line.brandId.isNotEmpty ? line.brandId : 'brand-default',
    code: line.brandName.isNotEmpty
        ? (line.brandName.length >= 2
            ? line.brandName.substring(0, 2).toUpperCase()
            : line.brandName.toUpperCase())
        : 'KK',
    name: line.brandName.isNotEmpty ? line.brandName : 'Main Brand',
  );
}

List<_ReviewBrandGroup> _groupCartLines(
  List<CartLine> lines,
  List<AssignedBrand> assignedBrands,
  AssignedBrand activeBrand,
) {
  final groups = <String, _ReviewBrandGroup>{};
  final orderedKeys = <String>[];

  for (final line in lines) {
    final brand = _resolveBrandForLine(line, assignedBrands, activeBrand);
    final key = brand.id.isNotEmpty ? brand.id : brand.code;

    if (!groups.containsKey(key)) {
      orderedKeys.add(key);
      groups[key] = _ReviewBrandGroup(
        brand: brand,
        lines: [line],
      );
    } else {
      groups[key]!.lines.add(line);
    }
  }

  return [for (final key in orderedKeys) groups[key]!];
}
