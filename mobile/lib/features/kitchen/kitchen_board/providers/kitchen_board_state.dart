import 'package:flutter/foundation.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';

@immutable
class KitchenBoardState {
  const KitchenBoardState({
    this.tickets = const [],
    this.updatedAt,
    this.isLoading = false,
    this.isRefreshing = false,
    this.loadingTicketIds = const {},
    this.errorMessage,
  });

  final List<KitchenBoardTicket> tickets;
  final DateTime? updatedAt;
  final bool isLoading;
  final bool isRefreshing;
  final Set<String> loadingTicketIds;
  final String? errorMessage;

  int get activeCount => tickets.length;

  List<KitchenBoardTicket> ticketsForLane(KitchenBoardLane lane) {
    return tickets
        .where((t) {
          final effectiveLane = switch (t.rawStatus.toUpperCase()) {
            'QUEUED' => KitchenBoardLane.queued,
            'ACKNOWLEDGED' => KitchenBoardLane.acknowledged,
            'PREPARING' => KitchenBoardLane.preparing,
            'REWORKING' => KitchenBoardLane.rework,
            'FOR_CHECKING' || 'CHECKING' => KitchenBoardLane.qcCheck,
            'READY' => KitchenBoardLane.ready,
            _ => t.lane,
          };
          return effectiveLane == lane;
        })
        .toList(growable: false);
  }

  KitchenBoardState copyWith({
    List<KitchenBoardTicket>? tickets,
    DateTime? updatedAt,
    bool? isLoading,
    bool? isRefreshing,
    Set<String>? loadingTicketIds,
    String? errorMessage,
    bool clearError = false,
  }) {
    return KitchenBoardState(
      tickets: tickets ?? this.tickets,
      updatedAt: updatedAt ?? this.updatedAt,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      loadingTicketIds: loadingTicketIds ?? this.loadingTicketIds,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  /// Formats a [DateTime] into 12-hour clock format (e.g. `'7:41 PM'`).
  static String formatTimeOfDay(DateTime dt) {
    final hour24 = dt.hour;
    final hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12;
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = hour24 >= 12 ? 'PM' : 'AM';
    return '$hour12:$minute $period';
  }
}
