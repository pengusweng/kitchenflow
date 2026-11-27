import 'dart:async';
import 'dart:io' show Platform;

import 'package:dio/dio.dart' show CancelToken;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_enricher.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_lifecycle_actions.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_preparation_actions.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_qc_actions.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_state.dart';
import 'package:mobile/features/new_order/data/repositories/brand_repository.dart';
import 'package:mobile/features/new_order/data/repositories/menu_repository.dart';
import 'package:mobile/shared/data/models/kitchen_ticket_data.dart';

export 'kitchen_board_state.dart';

class KitchenBoardNotifier extends Notifier<KitchenBoardState>
    with
        KitchenBoardQcActions,
        KitchenBoardPreparationActions,
        KitchenBoardLifecycleActions {
  StreamSubscription<List<KitchenBoardTicket>>? _ticketStreamSubscription;
  CancelToken? _streamCancelToken;
  Future<void> _processingChain = Future<void>.value();
  Timer? _reconnectTimer;
  Timer? _watchdogTimer;
  int _consecutiveReconnectFailures = 0;

  void _cancelTicketStream() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _streamCancelToken?.cancel('Disposed or refreshed');
    _streamCancelToken = null;
    final sub = _ticketStreamSubscription;
    _ticketStreamSubscription = null;
    if (sub != null) {
      unawaited(sub.cancel());
    }
  }

  @override
  KitchenBoardState build() {
    ref.onDispose(() {
      _watchdogTimer?.cancel();
      _watchdogTimer = null;
      _cancelTicketStream();
    });

    // Automatically refresh kitchen tickets whenever the user logs in or switches accounts
    ref.listen<String?>(sessionTokenProvider, (previous, next) {
      if (next != null && next != previous) {
        refresh(force: true);
      } else if (next == null && previous != null) {
        _cancelTicketStream();
        state = const KitchenBoardState(isLoading: false, tickets: []);
      }
    });

    _startWatchdogTimer();
    Future.microtask(loadInitial);
    return const KitchenBoardState(isLoading: true);
  }

  bool get _isTest {
    try {
      return Platform.environment.containsKey('FLUTTER_TEST');
    } catch (_) {
      return false;
    }
  }

  void _startWatchdogTimer() {
    if (_isTest) return;
    _watchdogTimer?.cancel();
    // Safety net: periodic background sync every 15s to guarantee fresh KDS state
    _watchdogTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (!ref.mounted) return;
      final lastUpdate = state.updatedAt;
      final isStale =
          lastUpdate == null ||
          DateTime.now().difference(lastUpdate) > const Duration(seconds: 15);
      if (isStale) {
        _fetchSilent();
      }
    });
  }

  Future<void> loadInitial() async {
    await _fetch(isRefresh: false);
  }

  Future<void> refresh({bool force = false}) async {
    if (!force && (state.isLoading || state.isRefreshing)) return;
    if (force && state.isRefreshing) return;
    await _fetch(isRefresh: true);
  }

  void _scheduleAutoReconnect() {
    if (!ref.mounted || _isTest) return;
    _reconnectTimer?.cancel();
    _consecutiveReconnectFailures++;
    // Exponential backoff capped at 5s: 1s, 2s, 5s...
    final delaySeconds = (_consecutiveReconnectFailures <= 1)
        ? 1
        : (_consecutiveReconnectFailures == 2 ? 2 : 5);

    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      if (!ref.mounted) return;
      _fetch(isRefresh: false);
    });
  }

  Future<void> _fetchSilent() async {
    if (!ref.mounted || state.isLoading || state.isRefreshing) return;
    try {
      final repo = ref.read(kitchenBoardRepositoryProvider);
      final rawTickets = await repo.fetchTodaysTickets();
      if (!ref.mounted) return;
      await applyIncomingTickets(repo, rawTickets);
    } catch (_) {
      // Background retry; silently continue
    }
  }

  Future<void> _fetch({required bool isRefresh}) async {
    _cancelTicketStream();

    state = state.copyWith(
      isLoading: !isRefresh,
      isRefreshing: isRefresh,
      clearError: true,
    );

    final repo = ref.read(kitchenBoardRepositoryProvider);
    final cancelToken = CancelToken();
    _streamCancelToken = cancelToken;
    final firstEmissionCompleter = Completer<void>();

    void completeIfPending() {
      if (!firstEmissionCompleter.isCompleted) {
        firstEmissionCompleter.complete();
      }
    }

    cancelToken.whenCancel.then((_) => completeIfPending());

    _ticketStreamSubscription = repo
        .watchTodaysTickets(cancelToken: cancelToken)
        .listen(
          (rawTickets) {
            _consecutiveReconnectFailures = 0;
            _processingChain = _processingChain.then((_) async {
              if (!ref.mounted || cancelToken.isCancelled) {
                completeIfPending();
                return;
              }
              try {
                await applyIncomingTickets(repo, rawTickets);
              } catch (error) {
                if (ref.mounted && !cancelToken.isCancelled) {
                  state = state.copyWith(
                    isLoading: false,
                    isRefreshing: false,
                    errorMessage: error.toString(),
                  );
                }
              } finally {
                completeIfPending();
              }
            });
          },
          onError: (Object error, StackTrace stackTrace) {
            _processingChain = _processingChain.then((_) {
              if (ref.mounted && !cancelToken.isCancelled) {
                state = state.copyWith(
                  isLoading: false,
                  isRefreshing: false,
                  errorMessage: error.toString(),
                );
              }
              completeIfPending();
              _scheduleAutoReconnect();
            });
          },
          onDone: () {
            _processingChain = _processingChain.then((_) {
              completeIfPending();
              _scheduleAutoReconnect();
            });
          },
        );

    await firstEmissionCompleter.future;
  }

  Future<void> applyIncomingTickets(
    KitchenBoardRepository repo,
    List<KitchenBoardTicket> rawTickets,
  ) async {
    final prevMap = {for (final t in state.tickets) t.kitchenTicketId: t};
    final tickets = await KitchenBoardEnricher.enrichTicketsWithOrders(
      repo: repo,
      tickets: rawTickets,
      prevMap: prevMap,
      isMounted: () => ref.mounted,
      getBrands: () => ref.read(brandRepositoryProvider).getAll(),
      getMenuItems: (brandId) =>
          ref.read(menuRepositoryProvider).getByBrand(brandId),
    );
    if (!ref.mounted) return;

    final mergedTickets = tickets.map((t) {
      final prev = prevMap[t.kitchenTicketId];
      if (prev != null) {
        final returnedReason = t.qcReturnedReason ?? prev.qcReturnedReason;
        final mergedItems = t.data.items.map((item) {
          final prevItem = prev.data.items
              .cast<KitchenTicketItem?>()
              .firstWhere(
                (p) =>
                    p != null &&
                    ((item.orderItemId != null &&
                            item.orderItemId == p.orderItemId) ||
                        p.name == item.name),
                orElse: () => null,
              );
          var updated = item;
          if (updated.brand == null && prevItem?.brand != null) {
            updated = updated.copyWith(brand: prevItem!.brand);
          }
          if (updated.failReason == null && prevItem?.failReason != null) {
            updated = updated.copyWith(failReason: prevItem!.failReason);
          }
          return updated;
        }).toList();

        if (returnedReason != null || mergedItems != t.data.items) {
          return t.copyWith(
            qcReturnedReason: returnedReason,
            data: t.data
                .copyWith(qcReturnedReason: returnedReason, items: mergedItems)
                .withItemsArrangedByBrand(),
          );
        }
      }
      return t;
    }).toList();

    state = state.copyWith(
      tickets: mergedTickets,
      updatedAt: DateTime.now(),
      isLoading: false,
      isRefreshing: false,
      clearError: true,
    );
  }
}

final kitchenBoardProvider =
    NotifierProvider<KitchenBoardNotifier, KitchenBoardState>(
      KitchenBoardNotifier.new,
    );
