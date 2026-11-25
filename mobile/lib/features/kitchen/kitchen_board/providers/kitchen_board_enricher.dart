import 'dart:async';

import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';

class KitchenBoardEnricher {
  const KitchenBoardEnricher._();

  static List<KitchenBoardTicket> preserveEnrichedDetails(
    List<KitchenBoardTicket> tickets,
    Map<String, KitchenBoardTicket> prevMap,
  ) {
    return tickets.map((t) {
      var current = t;
      final prev = prevMap[t.kitchenTicketId];
      if (prev != null) {
        if (prev.data.channel.isNotEmpty &&
            prev.data.channel != 'Takeaway' &&
            current.data.channel == 'Takeaway') {
          current = current.withChannel(
            prev.data.channel,
            reference:
                prev.data.reference.isNotEmpty &&
                    prev.data.reference != current.orderCode
                ? prev.data.reference
                : null,
          );
        }
        if (current.reworkNotes == null && prev.reworkNotes != null) {
          current = current.copyWith(reworkNotes: prev.reworkNotes);
        }
        if (current.qcReturnedReason == null && prev.qcReturnedReason != null) {
          current = current.copyWith(qcReturnedReason: prev.qcReturnedReason);
        }
        if (current.qcAttempts.isEmpty && prev.qcAttempts.isNotEmpty) {
          current = current.applyQcAttempts(prev.qcAttempts);
        } else if (current.qcAttempts.isNotEmpty && prev.qcAttempts.isNotEmpty) {
          final prevAttemptsMap = {
            for (final a in prev.qcAttempts) a.attemptNumber: a,
          };
          final mergedAttempts = current.qcAttempts.map((a) {
            final prevA = prevAttemptsMap[a.attemptNumber];
            if ((a.reworkNotes == null || a.reworkNotes!.trim().isEmpty) &&
                prevA?.reworkNotes != null) {
              return a.copyWith(reworkNotes: prevA!.reworkNotes);
            }
            return a;
          }).toList();
          current = current.copyWith(qcAttempts: mergedAttempts);
        }
      }
      return current;
    }).toList();
  }

  static Future<List<KitchenBoardTicket>> enrichTicketsWithOrders({
    required KitchenBoardRepository repo,
    required List<KitchenBoardTicket> tickets,
    required Map<String, KitchenBoardTicket> prevMap,
    required bool Function() isMounted,
    required Future<List<AssignedBrand>> Function() getBrands,
  }) async {
    final preserved = preserveEnrichedDetails(tickets, prevMap);

    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    List<AssignedBrand>? cachedBrands;

    Future<String?> resolveTicketBrandId(KitchenBoardTicket t) async {
      final directId = t.data.brand.id;
      if (uuidRegex.hasMatch(directId)) return directId;

      try {
        if (!isMounted()) return null;
        cachedBrands ??= await getBrands().timeout(
          const Duration(milliseconds: 300),
        );
        final code = t.data.brand.code.toUpperCase();
        final match = cachedBrands!.firstWhere(
          (b) => b.code.toUpperCase() == code,
          orElse: () => cachedBrands!.firstWhere(
            (b) => b.name.toLowerCase() == t.data.brand.name.toLowerCase(),
            orElse: () => cachedBrands!.first,
          ),
        );
        if (uuidRegex.hasMatch(match.id)) return match.id;
      } catch (_) {
        // Fallback
      }
      return null;
    }

    return Future.wait(
      preserved.map((t) async {
        var current = t;

        final isQcOrRework =
            current.rawStatus.toUpperCase() == 'REWORKING' ||
            current.rawStatus.toUpperCase() == 'FOR_CHECKING' ||
            current.rawStatus.toUpperCase() == 'CHECKING' ||
            current.qcFailureCount > 0;
        final needsQcHistory =
            isQcOrRework &&
            (current.qcAttempts.isEmpty ||
                current.pastQcAttempts.length < current.qcFailureCount);

        if (needsQcHistory && isMounted()) {
          try {
            final attempts = await repo
                .fetchTicketQcAttempts(current.kitchenTicketId)
                .timeout(const Duration(milliseconds: 300));
            if (attempts.isNotEmpty) {
              current = current.applyQcAttempts(attempts);
            }
          } catch (_) {
            // Keep ticket as is if QC attempts fetch fails
          }
        }

        if (current.orderId.isEmpty) return current;

        // Skip if ticket already has a resolved non-placeholder channel or reference
        final isPlaceholder =
            current.data.channel == 'Takeaway' &&
            (current.data.reference.isEmpty ||
                current.data.reference == current.orderCode);
        if (!isPlaceholder) return current;

        try {
          if (!isMounted()) return current;
          final brandId = await resolveTicketBrandId(current);
          if (brandId == null || !isMounted()) return current;
          final orderData = await repo
              .fetchOrder(brandId: brandId, orderId: current.orderId)
              .timeout(const Duration(milliseconds: 300));
          if (orderData != null) {
            return current.applyOrder(orderData);
          }
        } catch (_) {
          // If order fetch fails, keep ticket as is
        }
        return current;
      }),
    );
  }
}
