import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/models/user_role.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_enricher.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_state.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

mixin KitchenBoardLifecycleActions on Notifier<KitchenBoardState> {
  Future<String?> resolveCurrentUserId();

  Future<bool> acknowledgeTicket(String kitchenTicketId);
  Future<bool> prepareTicket(String kitchenTicketId);
  Future<bool> sendToQc(String kitchenTicketId, {String? reworkNotes});
  Future<bool> passQc({required String kitchenTicketId, String? attemptId});

  Future<bool> handOverTicket(
    String kitchenTicketId, {
    List<HandoverPhotoEvidence>? photos,
    List<String>? imgKeys,
  }) async {
    final userRole = ref.read(userRoleProvider);
    if (userRole == UserRole.supervisor) return false;

    if (state.loadingTicketIds.contains(kitchenTicketId)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, kitchenTicketId},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      await repo.handOverTicket(
        kitchenTicketId,
        photos: photos,
        imgKeys: imgKeys,
      );
      final prevMap = {for (final t in state.tickets) t.kitchenTicketId: t};
      final rawTickets = await repo.fetchTodaysTickets();
      final tickets = KitchenBoardEnricher.preserveEnrichedDetails(
        rawTickets,
        prevMap,
      );
      final nextLoading = Set<String>.from(state.loadingTicketIds)
        ..remove(kitchenTicketId);

      final updatedTickets = tickets
          .where((t) => t.kitchenTicketId != kitchenTicketId)
          .toList();

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

  Future<bool> performTicketAction(
    KitchenBoardTicket ticket, {
    List<HandoverPhotoEvidence>? photos,
    List<String>? imgKeys,
  }) async {
    final raw = ticket.rawStatus.toUpperCase();
    final isQcLane =
        raw == 'FOR_CHECKING' ||
        raw == 'CHECKING' ||
        ticket.data.status == KkfcStatus.checking ||
        ticket.lane == KitchenBoardLane.qcCheck;

    final userRole = ref.read(userRoleProvider);
    if (userRole != null &&
        !userRole.canChangeTicketStatus(isQcCheck: isQcLane)) {
      return false;
    }

    final isQueued =
        raw == 'QUEUED' ||
        ticket.data.status == KkfcStatus.queued ||
        ticket.lane == KitchenBoardLane.queued;
    if (isQueued) {
      return acknowledgeTicket(ticket.kitchenTicketId);
    }

    final isAcknowledged =
        raw == 'ACKNOWLEDGED' || ticket.data.status == KkfcStatus.acknowledged;
    if (isAcknowledged) {
      return prepareTicket(ticket.kitchenTicketId);
    }

    final isPreparingOrReworking =
        raw == 'PREPARING' ||
        raw == 'REWORKING' ||
        ticket.data.status == KkfcStatus.preparing ||
        ticket.data.status == KkfcStatus.reworking;
    if (isPreparingOrReworking) {
      return sendToQc(ticket.kitchenTicketId, reworkNotes: ticket.reworkNotes);
    }

    if (isQcLane) {
      return passQc(
        kitchenTicketId: ticket.kitchenTicketId,
        attemptId: ticket.qcAttemptId,
      );
    }

    final isReady =
        raw == 'READY' ||
        ticket.data.status == KkfcStatus.ready ||
        ticket.lane == KitchenBoardLane.ready;
    if (isReady) {
      return handOverTicket(
        ticket.kitchenTicketId,
        photos: photos,
        imgKeys: imgKeys,
      );
    }

    final id = ticket.kitchenTicketId;
    if (state.loadingTicketIds.contains(id)) return false;

    state = state.copyWith(
      loadingTicketIds: {...state.loadingTicketIds, id},
      clearError: true,
    );

    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final userId = await resolveCurrentUserId();
      await repo.advanceTicket(
        ticket,
        preparerId: userId,
        photos: photos,
        imgKeys: imgKeys,
      );
      final tickets = await repo.fetchTodaysTickets();
      final nextLoading = Set<String>.from(state.loadingTicketIds)..remove(id);
      state = state.copyWith(
        tickets: tickets,
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
