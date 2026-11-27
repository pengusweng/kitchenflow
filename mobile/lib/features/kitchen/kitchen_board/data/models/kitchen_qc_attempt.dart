import 'package:flutter/foundation.dart';

/// Represents an individual portion rejection recorded during a QC attempt.
@immutable
class KitchenQcRejection {
  const KitchenQcRejection({
    required this.rejectionId,
    required this.orderItemId,
    this.portionNumber = 1,
    this.rejectionReason = 'OTHER',
    this.description = '',
    this.rejectedAt,
  });

  final String rejectionId;
  final String orderItemId;
  final int portionNumber;
  final String rejectionReason;
  final String description;
  final DateTime? rejectedAt;

  /// Human-readable reason string combining description or enum reason.
  String get displayReason {
    final trimmedDesc = description.trim();
    if (trimmedDesc.isNotEmpty) return trimmedDesc;
    final trimmedReason = rejectionReason.trim();
    if (trimmedReason.isEmpty) return 'QC check failed';
    return _formatEnumReason(trimmedReason);
  }

  /// Formatted reason including portion number if applicable.
  String formatWithPortion({int? itemQuantity}) {
    final showPortion =
        portionNumber > 0 && (itemQuantity == null || itemQuantity > 1);
    if (showPortion) {
      return 'Portion $portionNumber: $displayReason';
    }
    return displayReason;
  }

  static String _formatEnumReason(String raw) {
    final clean = raw.replaceAll('_', ' ').toLowerCase();
    if (clean.isEmpty) return raw;
    return clean[0].toUpperCase() + clean.substring(1);
  }

  factory KitchenQcRejection.fromJson(Map<String, dynamic> json) {
    final rawDate = json['rejected_at'] as String?;
    return KitchenQcRejection(
      rejectionId:
          (json['rejection_id'] as String?)?.trim() ??
          (json['id'] as String?)?.trim() ??
          '',
      orderItemId: (json['order_item_id'] as String?)?.trim() ?? '',
      portionNumber: (json['portion_number'] as num?)?.toInt() ?? 1,
      rejectionReason:
          (json['rejection_reason'] as String?)?.trim() ??
          (json['reason'] as String?)?.trim() ??
          'OTHER',
      description:
          (json['description'] as String?)?.trim() ??
          (json['reason'] as String?)?.trim() ??
          '',
      rejectedAt: rawDate != null ? DateTime.tryParse(rawDate) : null,
    );
  }
}

/// Represents a Quality Check attempt from `GET /api/kitchen-qc/ticket/{ticketId}`.
@immutable
class KitchenQcAttempt {
  const KitchenQcAttempt({
    required this.qcAttemptId,
    required this.kitchenTicketId,
    required this.attemptNumber,
    required this.status,
    this.checkerId,
    this.checkerName,
    this.startedAt,
    this.completedAt,
    this.rejections = const [],
  });

  final String qcAttemptId;
  final String kitchenTicketId;
  final int attemptNumber;
  final String status;
  final String? checkerId;
  final String? checkerName;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final List<KitchenQcRejection> rejections;

  bool get isFailed => status.toUpperCase() == 'FAILED';
  bool get isPassed => status.toUpperCase() == 'PASSED';
  bool get isInProgress => status.toUpperCase() == 'IN_PROGRESS';

  KitchenQcAttempt copyWith({
    String? qcAttemptId,
    String? kitchenTicketId,
    int? attemptNumber,
    String? status,
    String? checkerId,
    String? checkerName,
    DateTime? startedAt,
    DateTime? completedAt,
    List<KitchenQcRejection>? rejections,
  }) {
    return KitchenQcAttempt(
      qcAttemptId: qcAttemptId ?? this.qcAttemptId,
      kitchenTicketId: kitchenTicketId ?? this.kitchenTicketId,
      attemptNumber: attemptNumber ?? this.attemptNumber,
      status: status ?? this.status,
      checkerId: checkerId ?? this.checkerId,
      checkerName: checkerName ?? this.checkerName,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      rejections: rejections ?? this.rejections,
    );
  }

  /// Formatted time of when the attempt completed or started (e.g. "2:15 PM").
  String? get formattedTimeLabel {
    final timestamp = completedAt ?? startedAt;
    if (timestamp == null) return null;
    final local = timestamp.toLocal();
    final hour24 = local.hour;
    final hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final period = hour24 >= 12 ? 'PM' : 'AM';
    return '$hour12:$minute $period';
  }

  factory KitchenQcAttempt.fromJson(Map<String, dynamic> json) {
    String? checkerName;
    final checkerRaw = json['checker'];
    if (checkerRaw is Map) {
      final first = (checkerRaw['first_name'] as String?)?.trim() ?? '';
      final last = (checkerRaw['last_name'] as String?)?.trim() ?? '';
      final combined = '$first $last'.trim();
      if (combined.isNotEmpty) {
        checkerName = combined;
      }
    } else if (json['checker_name'] is String) {
      final name = (json['checker_name'] as String).trim();
      if (name.isNotEmpty) checkerName = name;
    }

    final rawRejections =
        json['rejections'] ?? json['order_item_qc_rejections'];
    final rejections = <KitchenQcRejection>[];
    if (rawRejections is List) {
      for (final entry in rawRejections) {
        if (entry is Map<String, dynamic>) {
          rejections.add(KitchenQcRejection.fromJson(entry));
        } else if (entry is Map) {
          rejections.add(
            KitchenQcRejection.fromJson(Map<String, dynamic>.from(entry)),
          );
        }
      }
    }

    final startedRaw = json['started_at'] as String?;
    final completedRaw = json['completed_at'] as String?;

    return KitchenQcAttempt(
      qcAttemptId:
          (json['qc_attempt_id'] as String?)?.trim() ??
          (json['id'] as String?)?.trim() ??
          '',
      kitchenTicketId: (json['kitchen_ticket_id'] as String?)?.trim() ?? '',
      attemptNumber: (json['attempt_number'] as num?)?.toInt() ?? 1,
      status: (json['status'] as String?)?.trim().toUpperCase() ?? 'FAILED',
      checkerId: (json['checker_id'] as String?)?.trim(),
      checkerName: checkerName,
      startedAt: startedRaw != null ? DateTime.tryParse(startedRaw) : null,
      completedAt: completedRaw != null
          ? DateTime.tryParse(completedRaw)
          : null,
      rejections: rejections,
    );
  }

  /// Parses a list of [KitchenQcAttempt] from the API payload, ordered by
  /// [attemptNumber] descending (newest first).
  static List<KitchenQcAttempt> parseList(Object? raw) {
    List<dynamic>? list;
    if (raw is List) {
      list = raw;
    } else if (raw is Map) {
      if (raw['qcAttempts'] is List) {
        list = raw['qcAttempts'] as List;
      } else if (raw['data'] is List) {
        list = raw['data'] as List;
      }
    }
    if (list == null) return const [];

    final parsed = <KitchenQcAttempt>[];
    for (final item in list) {
      if (item is Map<String, dynamic>) {
        parsed.add(KitchenQcAttempt.fromJson(item));
      } else if (item is Map) {
        parsed.add(KitchenQcAttempt.fromJson(Map<String, dynamic>.from(item)));
      }
    }
    parsed.sort((a, b) => b.attemptNumber.compareTo(a.attemptNumber));
    return parsed;
  }
}
