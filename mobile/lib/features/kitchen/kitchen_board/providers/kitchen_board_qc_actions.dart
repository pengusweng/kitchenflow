import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/repository/auth_repository.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/fail_qc_send_to_rework_dialog.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_enricher.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_state.dart';
import 'package:mobile/features/new_order/data/repositories/brand_repository.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

mixin KitchenBoardQcActions on Notifier<KitchenBoardState> {
  Future<String?> resolveCurrentUserId() async {
    try {
      final authRepo = ref.read(authRepositoryProvider);
      return await authRepo.getCurrentUserId().timeout(
        const Duration(seconds: 2),
        onTimeout: () => null,
      );
    } catch (_) {
      return null;
    }
  }

  Future<String> resolveBrandId(KitchenBoardTicket ticket) async {
    final directId = ticket.data.brand.id;
    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    if (uuidRegex.hasMatch(directId)) {
      return directId;
    }

    try {
      if (!ref.mounted) return directId;
      final brandRepo = ref.read(brandRepositoryProvider);
      final brands = await brandRepo.getAll();
      final code = ticket.data.brand.code.toUpperCase();
      final match = brands.firstWhere(
        (b) => b.code.toUpperCase() == code,
        orElse: () => brands.firstWhere(
          (b) => b.name.toLowerCase() == ticket.data.brand.name.toLowerCase(),
          orElse: () => brands.first,
        ),
      );
      if (uuidRegex.hasMatch(match.id)) {
        return match.id;
      }
    } catch (_) {
      // Fallback
    }

    return directId;
  }

  Future<bool> passQc({
    required String kitchenTicketId,
    String? attemptId,
  }) async {
    final userRole = ref.read(userRoleProvider);
    if (userRole != null && !userRole.canPassQc) return false;

    if (state.loadingTicketIds.contains(kitchenTicketId)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, kitchenTicketId},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final userId = await resolveCurrentUserId();
      await repo.passQcForTicket(
        kitchenTicketId: kitchenTicketId,
        attemptId: attemptId,
        checkerId: userId,
      );
      final prevMap = {for (final t in state.tickets) t.kitchenTicketId: t};
      final rawTickets = await repo.fetchTodaysTickets();
      final tickets = KitchenBoardEnricher.preserveEnrichedDetails(
        rawTickets,
        prevMap,
      );
      final nextLoading = Set<String>.from(state.loadingTicketIds)
        ..remove(kitchenTicketId);

      final updatedTickets = tickets.map((t) {
        if (t.kitchenTicketId == kitchenTicketId &&
            (t.rawStatus.toUpperCase() == 'FOR_CHECKING' ||
                t.rawStatus.toUpperCase() == 'CHECKING' ||
                t.data.status == KkfcStatus.checking ||
                t.lane == KitchenBoardLane.qcCheck)) {
          return t.copyWith(
            rawStatus: 'READY',
            lane: KitchenBoardLane.ready,
            data: t.data
                .copyWith(status: KkfcStatus.ready)
                .withItemsArrangedByBrand(),
          );
        }
        return t;
      }).toList();

      state = state.copyWith(
        tickets: updatedTickets,
        updatedAt: DateTime.now(),
        loadingTicketIds: nextLoading,
        clearError: true,
      );
      return true;
    } catch (error) {
      final nextLoading = Set<String>.from(state.loadingTicketIds)
        ..remove(kitchenTicketId);
      state = state.copyWith(
        loadingTicketIds: nextLoading,
        errorMessage: error.toString(),
      );
      return false;
    }
  }

  Future<bool> rejectQc({
    required String kitchenTicketId,
    String? reason,
    String? attemptId,
    List<String>? orderItemIds,
    List<QcItemRejection>? rejections,
  }) async {
    final userRole = ref.read(userRoleProvider);
    if (userRole != null && !userRole.canPassQc) return false;

    if (state.loadingTicketIds.contains(kitchenTicketId)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, kitchenTicketId},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final userId = await resolveCurrentUserId();
      final effectiveReason =
          reason ??
          (rejections != null && rejections.isNotEmpty
              ? rejections.first.reason
              : 'QC failed');
      final rejectionsPayload = rejections?.map((r) => r.toJson()).toList();

      await repo.rejectQcForTicket(
        kitchenTicketId: kitchenTicketId,
        reason: effectiveReason,
        attemptId: attemptId,
        checkerId: userId,
        orderItemIds: orderItemIds,
        rejections: rejectionsPayload,
      );
      final prevMap = {for (final t in state.tickets) t.kitchenTicketId: t};
      final rawTickets = await repo.fetchTodaysTickets();
      final fetchedAttempts = await repo.fetchTicketQcAttempts(kitchenTicketId);
      final tickets = KitchenBoardEnricher.preserveEnrichedDetails(
        rawTickets,
        prevMap,
      );
      final nextLoading = Set<String>.from(state.loadingTicketIds)
        ..remove(kitchenTicketId);

      final updatedTickets = tickets.map((t) {
        if (t.kitchenTicketId == kitchenTicketId) {
          final updatedItems = t.data.items.map((item) {
            QcItemRejection? matching;
            if (rejections != null && rejections.isNotEmpty) {
              matching = rejections.cast<QcItemRejection?>().firstWhere(
                (r) =>
                    r != null &&
                    ((item.orderItemId != null &&
                            item.orderItemId == r.orderItemId) ||
                        (r.itemName != null && r.itemName == item.name)),
                orElse: () => null,
              );
            }
            if (matching != null && matching.reason.trim().isNotEmpty) {
              final reasonText = matching.portionNumber > 0 && item.quantity > 1
                  ? 'Portion ${matching.portionNumber}: ${matching.reason.trim()}'
                  : matching.reason.trim();
              return item.copyWith(failReason: reasonText);
            } else if (rejections != null && rejections.isNotEmpty) {
              return item.copyWith(clearFailReason: true);
            } else {
              return item.copyWith(failReason: effectiveReason);
            }
          }).toList();

          var nextTicket = t.copyWith(
            rawStatus: 'REWORKING',
            lane: KitchenBoardLane.rework,
            clearQcAttemptId: true,
            qcReturnedReason: effectiveReason,
            data: t.data
                .copyWith(
                  status: KkfcStatus.reworking,
                  qcReturnedReason: effectiveReason,
                  items: updatedItems,
                )
                .withItemsArrangedByBrand(),
          );
          if (fetchedAttempts.isNotEmpty) {
            nextTicket = nextTicket.applyQcAttempts(fetchedAttempts);
          }
          return nextTicket;
        }
        return t;
      }).toList();

      state = state.copyWith(
        tickets: updatedTickets,
        updatedAt: DateTime.now(),
        loadingTicketIds: nextLoading,
        clearError: true,
      );
      return true;
    } catch (error) {
      final nextLoading = Set<String>.from(state.loadingTicketIds)
        ..remove(kitchenTicketId);
      state = state.copyWith(
        loadingTicketIds: nextLoading,
        errorMessage: error.toString(),
      );
      return false;
    }
  }

  /// Fetches all QC attempts for [kitchenTicketId] via
  /// `GET /api/kitchen-qc/ticket/{ticketId}` and updates the ticket in state.
  Future<List<KitchenQcAttempt>> loadTicketQcAttempts(
    String kitchenTicketId,
  ) async {
    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final attempts = await repo.fetchTicketQcAttempts(kitchenTicketId);
      if (!ref.mounted) return attempts;
      if (attempts.isNotEmpty) {
        final updated = state.tickets.map((t) {
          if (t.kitchenTicketId == kitchenTicketId) {
            return t.applyQcAttempts(attempts);
          }
          return t;
        }).toList();
        state = state.copyWith(tickets: updated);
      }
      return attempts;
    } catch (_) {
      return const [];
    }
  }

  Future<bool> cancelTicket({
    required KitchenBoardTicket ticket,
    required String reason,
  }) async {
    final userRole = ref.read(userRoleProvider);
    if (userRole != null && !userRole.canCancelTicket) return false;

    final id = ticket.kitchenTicketId;
    if (state.loadingTicketIds.contains(id)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, id},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final brandId = await resolveBrandId(ticket);
      await repo.cancelTicket(
        brandId: brandId,
        orderId: ticket.orderId,
        reason: reason,
      );
      final prevMap = {for (final t in state.tickets) t.kitchenTicketId: t};
      final rawTickets = await repo.fetchTodaysTickets();
      final tickets = KitchenBoardEnricher.preserveEnrichedDetails(
        rawTickets,
        prevMap,
      );
      final nextLoading = Set<String>.from(state.loadingTicketIds)..remove(id);

      final updatedTickets = tickets
          .where((t) => t.kitchenTicketId != id)
          .toList();

      state = state.copyWith(
        tickets: updatedTickets,
        updatedAt: DateTime.now(),
        loadingTicketIds: nextLoading,
        clearError: true,
      );
      return true;
    } catch (error) {
      final nextLoading = Set<String>.from(state.loadingTicketIds)..remove(id);
      state = state.copyWith(
        loadingTicketIds: nextLoading,
        errorMessage: error.toString(),
      );
      return false;
    }
  }
}
