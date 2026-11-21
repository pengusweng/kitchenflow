import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_fulfillment_api.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_handover_api.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_ticket_sse_stream.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_handover_photo_card.dart';

export 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_handover_photo_card.dart'
    show HandoverPhotoEvidence;

class KitchenBoardException implements Exception {
  const KitchenBoardException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Repository for fetching and updating kitchen board tickets.
class KitchenBoardRepository {
  KitchenBoardRepository(this._dio) {
    _fulfillment = KitchenFulfillmentApi(_dio, _endpoint, _errorMessage);
    _handover = KitchenHandoverApi(
      dio: _dio,
      endpoint: _endpoint,
      errorMessage: _errorMessage,
      onAcknowledge: acknowledgeTicket,
      onPrepare: prepareTicket,
      onSendToQc: sendToQc,
      onPassQc: passQcForTicket,
    );
  }

  final Dio _dio;
  late final KitchenFulfillmentApi _fulfillment;
  late final KitchenHandoverApi _handover;

  String _endpoint(String pathWithoutApiPrefix) {
    final base = _dio.options.baseUrl.trim();
    final strippedBase = base.endsWith('/')
        ? base.substring(0, base.length - 1)
        : base;
    if (strippedBase.endsWith('/api')) {
      return pathWithoutApiPrefix;
    }
    return '/api$pathWithoutApiPrefix';
  }

  /// Streams today's kitchen tickets from `GET /api/kitchen-ticket/today/stream`.
  Stream<List<KitchenBoardTicket>> streamTodaysTickets({
    DateTime? now,
    CancelToken? cancelToken,
  }) {
    return KitchenTicketSseStream.stream(
      dio: _dio,
      endpoint: _endpoint('/kitchen-ticket/today/stream'),
      errorMessage: _errorMessage,
      now: now,
      cancelToken: cancelToken,
    );
  }

  /// Watches today's kitchen tickets via `GET /api/kitchen-ticket/today/stream`,
  /// falling back to `GET /api/kitchen-ticket/today` if the stream fails.
  Stream<List<KitchenBoardTicket>> watchTodaysTickets({
    DateTime? now,
    CancelToken? cancelToken,
  }) async* {
    var emittedAny = false;
    try {
      await for (final tickets in streamTodaysTickets(
        now: now,
        cancelToken: cancelToken,
      )) {
        emittedAny = true;
        yield tickets;
      }
    } catch (_) {
      if (cancelToken?.isCancelled ?? false) return;
      try {
        if (runtimeType != KitchenBoardRepository) {
          yield await fetchTodaysTickets(now: now);
        } else {
          yield await fetchTodaysTicketsFallback(now: now);
        }
      } catch (_) {
        if (!emittedAny) rethrow;
      }
      return;
    }

    if (!emittedAny && !(cancelToken?.isCancelled ?? false)) {
      if (runtimeType != KitchenBoardRepository) {
        yield await fetchTodaysTickets(now: now);
      } else {
        yield await fetchTodaysTicketsFallback(now: now);
      }
    }
  }

  /// Fetches today's kitchen tickets using stream first, with REST fallback.
  Future<List<KitchenBoardTicket>> fetchTodaysTickets({DateTime? now}) async {
    final cancelToken = CancelToken();
    try {
      final tickets = await streamTodaysTickets(
        now: now,
        cancelToken: cancelToken,
      ).first;
      return tickets;
    } catch (_) {
      return fetchTodaysTicketsFallback(now: now);
    } finally {
      if (!cancelToken.isCancelled) {
        cancelToken.cancel('Snapshot completed');
      }
    }
  }

  /// Fetches today's kitchen tickets from `GET /api/kitchen-ticket/today`.
  Future<List<KitchenBoardTicket>> fetchTodaysTicketsFallback({
    DateTime? now,
  }) async {
    try {
      final response = await _dio.get<Object?>(
        _endpoint('/kitchen-ticket/today'),
      );
      final rawList = KitchenTicketSseStream.extractTicketList(response.data);
      return KitchenTicketSseStream.parseTicketList(rawList, now: now);
    } on DioException catch (error) {
      throw KitchenBoardException(
        _errorMessage(error),
        statusCode: error.response?.statusCode,
      );
    }
  }

  String _errorMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final msg = data['message'];
      if (msg is String && msg.trim().isNotEmpty) return msg.trim();
      if (msg is List && msg.isNotEmpty) return msg.first.toString();
    }
    if (error.response == null) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
    return switch (error.response?.statusCode) {
      401 => 'Your session expired. Sign in again.',
      403 => 'You do not have permission to view kitchen tickets.',
      _ => 'Failed to load kitchen tickets.',
    };
  }

  // Delegation to KitchenFulfillmentApi
  Future<void> assignPreparer(String ticketId, String preparerId) =>
      _fulfillment.assignPreparer(ticketId, preparerId);

  Future<void> assignChecker(String ticketId, String checkerId) =>
      _fulfillment.assignChecker(ticketId, checkerId);

  Future<void> acknowledgeTicket(String ticketId, {String? preparerId}) =>
      _fulfillment.acknowledgeTicket(ticketId, preparerId: preparerId);

  Future<void> prepareTicket(String ticketId, {String? preparerId}) =>
      _fulfillment.prepareTicket(ticketId, preparerId: preparerId);

  Future<void> sendToQc(String ticketId, {String? preparerId}) =>
      _fulfillment.sendToQc(ticketId, preparerId: preparerId);

  Future<String?> checkTicket(String ticketId, {String? checkerId}) =>
      _fulfillment.checkTicket(ticketId, checkerId: checkerId);

  Future<String?> fetchLatestQcAttemptId(String ticketId) =>
      _fulfillment.fetchLatestQcAttemptId(ticketId);

  Future<void> passQcAttempt(String attemptId) =>
      _fulfillment.passQcAttempt(attemptId);

  Future<void> passQcForTicket({
    required String kitchenTicketId,
    String? attemptId,
    String? checkerId,
  }) =>
      _fulfillment.passQcForTicket(
        kitchenTicketId: kitchenTicketId,
        attemptId: attemptId,
        checkerId: checkerId,
      );

  Future<void> rejectQcAttempt(
    String attemptId, {
    required List<Map<String, dynamic>> rejections,
  }) =>
      _fulfillment.rejectQcAttempt(attemptId, rejections: rejections);

  Future<void> rejectQcForTicket({
    required String kitchenTicketId,
    required String reason,
    String? attemptId,
    String? checkerId,
    List<String>? orderItemIds,
    List<Map<String, dynamic>>? rejections,
  }) =>
      _fulfillment.rejectQcForTicket(
        kitchenTicketId: kitchenTicketId,
        reason: reason,
        attemptId: attemptId,
        checkerId: checkerId,
        orderItemIds: orderItemIds,
        rejections: rejections,
      );

  // Delegation to KitchenHandoverApi
  Future<void> handOverTicket(
    String ticketId, {
    List<HandoverPhotoEvidence>? photos,
    List<String>? imgKeys,
  }) =>
      _handover.handOverTicket(ticketId, photos: photos, imgKeys: imgKeys);

  Future<void> advanceTicket(
    KitchenBoardTicket ticket, {
    String? preparerId,
    List<HandoverPhotoEvidence>? photos,
    List<String>? imgKeys,
  }) =>
      _handover.advanceTicket(
        ticket,
        preparerId: preparerId,
        photos: photos,
        imgKeys: imgKeys,
      );

  Future<void> cancelTicket({
    required String brandId,
    required String orderId,
    required String reason,
  }) =>
      _handover.cancelTicket(brandId: brandId, orderId: orderId, reason: reason);

  Future<Map<String, dynamic>?> fetchOrder({
    required String brandId,
    required String orderId,
  }) =>
      _handover.fetchOrder(brandId: brandId, orderId: orderId);
}

final kitchenBoardRepositoryProvider = Provider<KitchenBoardRepository>((ref) {
  return KitchenBoardRepository(ref.watch(dioProvider));
});
