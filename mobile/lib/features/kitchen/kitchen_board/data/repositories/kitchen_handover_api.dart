import 'package:dio/dio.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_handover_photo_card.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

class KitchenHandoverApi {
  KitchenHandoverApi({
    required this.dio,
    required this.endpoint,
    required this.errorMessage,
    required this.onAcknowledge,
    required this.onPrepare,
    required this.onSendToQc,
    required this.onPassQc,
  });

  final Dio dio;
  final String Function(String path) endpoint;
  final String Function(DioException error) errorMessage;
  final Future<void> Function(String ticketId, {String? preparerId})
  onAcknowledge;
  final Future<void> Function(String ticketId, {String? preparerId}) onPrepare;
  final Future<void> Function(String ticketId, {String? preparerId}) onSendToQc;
  final Future<void> Function({
    required String kitchenTicketId,
    String? attemptId,
    String? checkerId,
  })
  onPassQc;

  Exception _wrap(DioException error) => Exception(errorMessage(error));

  Future<void> handOverTicket(
    String kitchenTicketId, {
    List<HandoverPhotoEvidence>? photos,
    List<String>? imgKeys,
  }) async {
    try {
      dynamic data;
      if (photos != null && photos.isNotEmpty) {
        final formData = FormData();
        for (final photo in photos) {
          var filename = photo.name.trim();
          if (filename.isEmpty) {
            filename = 'handover_evidence.jpg';
          }
          final lower = filename.toLowerCase();
          final isPng = lower.endsWith('.png');
          final isJpg = lower.endsWith('.jpg') || lower.endsWith('.jpeg');
          if (!isPng && !isJpg) {
            filename = '$filename.jpg';
          }
          final contentType = filename.toLowerCase().endsWith('.png')
              ? DioMediaType('image', 'png')
              : DioMediaType('image', 'jpeg');

          if (photo.bytes != null && photo.bytes!.isNotEmpty) {
            formData.files.add(
              MapEntry(
                'files',
                MultipartFile.fromBytes(
                  photo.bytes!,
                  filename: filename,
                  contentType: contentType,
                ),
              ),
            );
          } else if (photo.path != null && photo.path!.isNotEmpty) {
            formData.files.add(
              MapEntry(
                'files',
                await MultipartFile.fromFile(
                  photo.path!,
                  filename: filename,
                  contentType: contentType,
                ),
              ),
            );
          }
        }
        if (imgKeys != null && imgKeys.isNotEmpty) {
          for (final key in imgKeys) {
            formData.fields.add(MapEntry('img_keys[]', key));
          }
        }
        if (formData.files.isNotEmpty || formData.fields.isNotEmpty) {
          data = formData;
        }
      } else if (imgKeys != null && imgKeys.isNotEmpty) {
        data = {'img_keys': imgKeys};
      }

      await dio.post<Object?>(
        endpoint('/kitchen-fulfillment/$kitchenTicketId/hand-over'),
        data: data,
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }
  }

  Future<void> advanceTicket(
    KitchenBoardTicket ticket, {
    String? preparerId,
    List<HandoverPhotoEvidence>? photos,
    List<String>? imgKeys,
  }) async {
    final id = ticket.kitchenTicketId;
    final raw = ticket.rawStatus.toUpperCase();
    if (raw == 'QUEUED' || ticket.data.status == KkfcStatus.queued) {
      await onAcknowledge(id, preparerId: preparerId);
      return;
    }
    if (raw == 'ACKNOWLEDGED' ||
        ticket.data.status == KkfcStatus.acknowledged) {
      await onPrepare(id, preparerId: preparerId);
      return;
    }

    final isPreparingOrReworking =
        raw == 'PREPARING' ||
        raw == 'REWORKING' ||
        ticket.data.status == KkfcStatus.preparing ||
        ticket.data.status == KkfcStatus.reworking;
    if (isPreparingOrReworking) {
      await onSendToQc(id, preparerId: preparerId);
      return;
    }

    final isQcLane =
        raw == 'FOR_CHECKING' ||
        raw == 'CHECKING' ||
        ticket.data.status == KkfcStatus.checking ||
        ticket.lane == KitchenBoardLane.qcCheck;
    if (isQcLane) {
      await onPassQc(
        kitchenTicketId: id,
        attemptId: ticket.qcAttemptId,
        checkerId: preparerId,
      );
      return;
    }

    if (raw == 'READY' || ticket.data.status == KkfcStatus.ready) {
      await handOverTicket(id, photos: photos, imgKeys: imgKeys);
      return;
    }
  }

  Future<void> cancelTicket({
    required String brandId,
    required String orderId,
    required String reason,
  }) async {
    try {
      await dio.post<Object?>(
        endpoint('/kitchen-fulfillment/brands/$brandId/orders/$orderId/cancel'),
        data: {'cancellation_reason': reason.trim()},
      );
    } on DioException catch (error) {
      throw _wrap(error);
    }
  }

  Future<Map<String, dynamic>?> fetchOrder({
    required String brandId,
    required String orderId,
  }) async {
    try {
      final response = await dio.get<Object?>(
        endpoint('/brands/$brandId/orders/$orderId'),
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return data;
      } else if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
    } catch (_) {
      // Fallback
    }
    return null;
  }
}
