import 'package:dio/dio.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';

class KitchenFulfillmentApi {
  KitchenFulfillmentApi(this._dio, this._endpoint, this._errorMessage);

  final Dio _dio;
  final String Function(String path) _endpoint;
  final String Function(DioException error) _errorMessage;

  Exception _wrap(DioException error) => Exception(_errorMessage(error));

  Future<void> assignPreparer(String kitchenTicketId, String preparerId) async {
    try {
      await _dio.patch<Object?>(
        _endpoint('/kitchen-ticket/$kitchenTicketId/preparer'),
        data: {'preparer_id': preparerId},
      );
    } on DioException catch (error) {
      if (error.response?.statusCode == 409) return;
      throw _wrap(error);
    }
  }

  Future<void> assignChecker(String kitchenTicketId, String checkerId) async {
    try {
      await _dio.patch<Object?>(
        _endpoint('/kitchen-ticket/$kitchenTicketId/checker'),
        data: {'checker_id': checkerId},
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }
  }

  Future<void> acknowledgeTicket(
    String kitchenTicketId, {
    String? preparerId,
  }) async {
    try {
      await _dio.post<Object?>(
        _endpoint('/kitchen-fulfillment/$kitchenTicketId/acknowledge'),
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }

    if (preparerId != null && preparerId.isNotEmpty) {
      try {
        await assignPreparer(kitchenTicketId, preparerId);
      } catch (_) {
        // Non-blocking
      }
    }
  }

  Future<void> prepareTicket(
    String kitchenTicketId, {
    String? preparerId,
  }) async {
    if (preparerId != null && preparerId.isNotEmpty) {
      try {
        await assignPreparer(kitchenTicketId, preparerId);
      } catch (_) {
        // Continue
      }
    }

    try {
      await _dio.post<Object?>(
        _endpoint('/kitchen-fulfillment/$kitchenTicketId/prepare'),
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }
  }

  Future<void> sendToQc(String kitchenTicketId, {String? preparerId}) async {
    if (preparerId != null && preparerId.isNotEmpty) {
      try {
        await assignPreparer(kitchenTicketId, preparerId);
      } catch (_) {
        // Continue
      }
    }

    try {
      await _dio.post<Object?>(
        _endpoint('/kitchen-fulfillment/$kitchenTicketId/for-checking'),
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }
  }

  Future<String?> checkTicket(
    String kitchenTicketId, {
    String? checkerId,
  }) async {
    if (checkerId != null && checkerId.isNotEmpty) {
      try {
        await assignChecker(kitchenTicketId, checkerId);
      } catch (_) {
        // Continue
      }
    }

    try {
      final response = await _dio.post<dynamic>(
        _endpoint('/kitchen-fulfillment/$kitchenTicketId/check'),
      );
      final data = response.data;
      if (data is Map) {
        final attempt = data['attempt'];
        if (attempt is Map && attempt['qc_attempt_id'] is String) {
          return attempt['qc_attempt_id'] as String;
        }
      }
    } on DioException catch (error) {
      throw _wrap(error);
    }
    return null;
  }

  Future<String?> fetchLatestQcAttemptId(String kitchenTicketId) async {
    try {
      final response = await _dio.get<dynamic>(
        _endpoint('/kitchen-qc/ticket/$kitchenTicketId/latest'),
      );
      final data = response.data;
      if (data is Map) {
        final status = (data['status'] as String?)?.toUpperCase();
        if (status != null && status != 'IN_PROGRESS') {
          return null;
        }
        if (data['qc_attempt_id'] is String) {
          return data['qc_attempt_id'] as String;
        }
      }
    } catch (_) {
      // Ignore lookup failure
    }
    return null;
  }

  Future<void> passQcAttempt(String attemptId) async {
    try {
      await _dio.post<Object?>(
        _endpoint('/kitchen-fulfillment/qc-attempts/$attemptId/pass'),
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }
  }

  Future<void> passQcForTicket({
    required String kitchenTicketId,
    String? attemptId,
    String? checkerId,
  }) async {
    final inProgressAttemptId = await fetchLatestQcAttemptId(kitchenTicketId);
    var resolvedAttemptId = inProgressAttemptId;
    if (resolvedAttemptId == null || resolvedAttemptId.isEmpty) {
      resolvedAttemptId = await checkTicket(
        kitchenTicketId,
        checkerId: checkerId,
      );
    }
    resolvedAttemptId ??= attemptId ?? kitchenTicketId;
    await passQcAttempt(resolvedAttemptId);
  }

  Future<void> rejectQcAttempt(
    String attemptId, {
    required List<Map<String, dynamic>> rejections,
  }) async {
    try {
      await _dio.post<Object?>(
        _endpoint('/kitchen-fulfillment/qc-attempts/$attemptId/reject'),
        data: {'rejections': rejections},
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }
  }

  Future<void> rejectQcForTicket({
    required String kitchenTicketId,
    required String reason,
    String? attemptId,
    String? checkerId,
    List<String>? orderItemIds,
    List<Map<String, dynamic>>? rejections,
  }) async {
    final inProgressAttemptId = await fetchLatestQcAttemptId(kitchenTicketId);
    var resolvedAttemptId = inProgressAttemptId;
    if (resolvedAttemptId == null || resolvedAttemptId.isEmpty) {
      resolvedAttemptId = await checkTicket(
        kitchenTicketId,
        checkerId: checkerId,
      );
    }
    resolvedAttemptId ??= attemptId ?? kitchenTicketId;

    var effectiveItemIds = orderItemIds
        ?.where((id) => id.trim().isNotEmpty)
        .toList();

    final needsItemIds =
        effectiveItemIds == null ||
        effectiveItemIds.isEmpty ||
        (rejections != null &&
            rejections.any(
              (r) => (r['order_item_id'] as String?)?.trim().isEmpty ?? true,
            ));

    if (needsItemIds) {
      try {
        final res = await _dio.get<Object?>(
          _endpoint('/kitchen-ticket/$kitchenTicketId'),
        );
        final data = res.data;
        if (data is Map<String, dynamic>) {
          final parsedTicket = KitchenBoardTicket.tryFromApiJson(data);
          final fetchedIds = parsedTicket?.data.items
              .map((i) => i.orderItemId)
              .whereType<String>()
              .where((id) => id.trim().isNotEmpty)
              .toList();
          if (fetchedIds != null && fetchedIds.isNotEmpty) {
            effectiveItemIds = fetchedIds;
          }
        } else if (data is Map) {
          final parsedTicket = KitchenBoardTicket.tryFromApiJson(
            Map<String, dynamic>.from(data),
          );
          final fetchedIds = parsedTicket?.data.items
              .map((i) => i.orderItemId)
              .whereType<String>()
              .where((id) => id.trim().isNotEmpty)
              .toList();
          if (fetchedIds != null && fetchedIds.isNotEmpty) {
            effectiveItemIds = fetchedIds;
          }
        }
      } catch (_) {
        // Fallback
      }
    }

    final rejectionsPayload =
        rejections ??
        (effectiveItemIds != null && effectiveItemIds.isNotEmpty
            ? effectiveItemIds
                  .map((id) => {'order_item_id': id, 'reason': reason})
                  .toList()
            : [
                {'order_item_id': kitchenTicketId, 'reason': reason},
              ]);

    await rejectQcAttempt(resolvedAttemptId, rejections: rejectionsPayload);
  }
}
