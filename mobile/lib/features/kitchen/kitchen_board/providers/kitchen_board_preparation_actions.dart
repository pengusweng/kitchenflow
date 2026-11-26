import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/user_role.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_enricher.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_state.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

mixin KitchenBoardPreparationActions on Notifier<KitchenBoardState> {
  Future<String?> resolveCurrentUserId();

  Future<bool> acknowledgeTicket(String kitchenTicketId) async {
    final userRole = ref.read(userRoleProvider);
    if (userRole == UserRole.supervisor) return false;

    if (state.loadingTicketIds.contains(kitchenTicketId)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, kitchenTicketId},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final userId = await resolveCurrentUserId();
      await repo.acknowledgeTicket(kitchenTicketId, preparerId: userId);
      final prevMap = {for (final t in state.tickets) t.kitchenTicketId: t};
      final rawTickets = await repo.fetchTodaysTickets();
      final tickets = KitchenBoardEnricher.preserveEnrichedDetails(
        rawTickets,
        prevMap,
      );
      final nextLoading = Set<String>.from(state.loadingTicketIds)
        ..remove(kitchenTicketId);

      // Ensure ticket is in ACKNOWLEDGED state even if repository is static/mock.
      final updatedTickets = tickets.map((t) {
        if (t.kitchenTicketId == kitchenTicketId &&
            t.rawStatus.toUpperCase() == 'QUEUED') {
          return t.copyWith(
            rawStatus: 'ACKNOWLEDGED',
            lane: KitchenBoardLane.acknowledged,
            data: t.data.copyWith(status: KkfcStatus.acknowledged),
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

  Future<bool> prepareTicket(String kitchenTicketId) async {
    final userRole = ref.read(userRoleProvider);
    if (userRole == UserRole.supervisor) return false;

    if (state.loadingTicketIds.contains(kitchenTicketId)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, kitchenTicketId},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final userId = await resolveCurrentUserId();
      await repo.prepareTicket(kitchenTicketId, preparerId: userId);
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
            (t.rawStatus.toUpperCase() == 'ACKNOWLEDGED' ||
                t.data.status == KkfcStatus.acknowledged)) {
          return t.copyWith(
            rawStatus: 'PREPARING',
            lane: KitchenBoardLane.preparing,
            data: t.data.copyWith(status: KkfcStatus.preparing),
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

  Future<bool> sendToQc(String kitchenTicketId) async {
    final userRole = ref.read(userRoleProvider);
    if (userRole == UserRole.supervisor) return false;

    if (state.loadingTicketIds.contains(kitchenTicketId)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, kitchenTicketId},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final userId = await resolveCurrentUserId();
      await repo.sendToQc(kitchenTicketId, preparerId: userId);
      final prevMap = {for (final t in state.tickets) t.kitchenTicketId: t};
      final rawTickets = await repo.fetchTodaysTickets();
      final tickets = KitchenBoardEnricher.preserveEnrichedDetails(
        rawTickets,
        prevMap,
      );
      final nextLoading = Set<String>.from(state.loadingTicketIds)
        ..remove(kitchenTicketId);

      final prevTicket = state.tickets.firstWhere(
        (t) => t.kitchenTicketId == kitchenTicketId,
        orElse: () => tickets.firstWhere(
          (t) => t.kitchenTicketId == kitchenTicketId,
          orElse: () => tickets.first,
        ),
      );
      final effectiveQcReturnedReason = prevTicket.qcReturnedReason;

      final updatedTickets = tickets.map((t) {
        if (t.kitchenTicketId == kitchenTicketId) {
          final clearedItems = t.data.items
              .map((it) => it.copyWith(clearFailReason: true))
              .toList();
          return t.copyWith(
            rawStatus: 'FOR_CHECKING',
            lane: KitchenBoardLane.qcCheck,
            clearQcAttemptId: true,
            qcReturnedReason: effectiveQcReturnedReason,
            qcAttempts: t.qcAttempts,
            data: t.data.copyWith(
              status: KkfcStatus.checking,
              qcReturnedReason: effectiveQcReturnedReason,
              items: clearedItems,
            ),
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
}
