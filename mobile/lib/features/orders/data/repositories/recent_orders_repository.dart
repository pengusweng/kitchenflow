import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';

class RecentOrdersException implements Exception {
  const RecentOrdersException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Repository for fetching recent orders from the backend Orders API:
/// - `GET /orders` (`AllOrdersController.findAll`)
/// - `GET /brands/:brandId/orders` (`OrdersController.findAll`)
/// - `GET /brands/:brandId/orders/:orderId` (`OrdersController.findOne`)
class RecentOrdersRepository {
  RecentOrdersRepository(this._dio);

  final Dio _dio;

  static final _uuidRegex = RegExp(
    r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  );

  /// Fetches recent orders across brands from `GET /orders`, enriching summary
  /// rows with full line items and kitchen ticket data from
  /// `GET /brands/:brandId/orders` (or `GET /brands/:brandId/orders/:orderId`).
  Future<List<RecentOrder>> fetchRecentOrders({
    String? brandId,
    int page = 1,
    int limit = 50,
    String? search,
    String? status,
    String? paymentStatus,
    CancelToken? cancelToken,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        if (status != null && status.trim().isNotEmpty) 'status': status.trim(),
        if (paymentStatus != null && paymentStatus.trim().isNotEmpty)
          'payment_status': paymentStatus.trim(),
        if (brandId != null && _uuidRegex.hasMatch(brandId))
          'brand_id': brandId,
      };

      final response = await _dio.get<Object?>(
        '/orders',
        queryParameters: queryParams,
        cancelToken: cancelToken,
      );

      final rawOrders = _extractOrderList(response.data);
      final parsed = rawOrders
          .map(RecentOrder.fromApiJson)
          .where((order) => !order.isDraft)
          .toList();

      // Hydrate any summary rows (which omit order_items_order and kitchen_tickets_order)
      return await _hydrateOrderDetails(parsed, limit: limit);
    } on DioException catch (error) {
      if (brandId != null && _uuidRegex.hasMatch(brandId)) {
        return fetchBrandOrders(
          brandId: brandId,
          page: page,
          limit: limit,
          status: status,
        );
      }
      throw RecentOrdersException(
        _errorMessage(error),
        statusCode: error.response?.statusCode,
      );
    }
  }

  /// Fetches full brand-scoped orders from `GET /brands/:brandId/orders`.
  Future<List<RecentOrder>> fetchBrandOrders({
    required String brandId,
    int page = 1,
    int limit = 50,
    String? status,
    String? orderChannel,
    String? orderDate,
  }) async {
    try {
      final response = await _dio.get<Object?>(
        '/brands/$brandId/orders',
        queryParameters: <String, dynamic>{
          'page': page,
          'limit': limit,
          if (status != null && status.trim().isNotEmpty)
            'status': status.trim(),
          if (orderChannel != null && orderChannel.trim().isNotEmpty)
            'order_channel': orderChannel.trim(),
          if (orderDate != null && orderDate.trim().isNotEmpty)
            'order_date': orderDate.trim(),
        },
      );

      final rawOrders = _extractOrderList(response.data);
      return rawOrders
          .map(RecentOrder.fromApiJson)
          .where((order) => !order.isDraft)
          .toList();
    } on DioException catch (error) {
      throw RecentOrdersException(
        _errorMessage(error),
        statusCode: error.response?.statusCode,
      );
    }
  }

  /// Fetches a single order with its line items, modifiers, and kitchen ticket
  /// from `GET /brands/:brandId/orders/:orderId`.
  Future<RecentOrder> fetchOrderDetail({
    required String brandId,
    required String orderId,
  }) async {
    try {
      final response = await _dio.get<Object?>(
        '/brands/$brandId/orders/$orderId',
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return RecentOrder.fromApiJson(data);
      }
      if (data is Map) {
        return RecentOrder.fromApiJson(Map<String, dynamic>.from(data));
      }
      throw const FormatException('Invalid order detail response.');
    } on DioException catch (error) {
      throw RecentOrdersException(
        _errorMessage(error),
        statusCode: error.response?.statusCode,
      );
    }
  }

  Future<List<RecentOrder>> _hydrateOrderDetails(
    List<RecentOrder> orders, {
    required int limit,
  }) async {
    final needsHydration = orders
        .where(
          (o) =>
              !o.hasLoadedDetails &&
              _uuidRegex.hasMatch(o.brandId) &&
              _uuidRegex.hasMatch(o.id),
        )
        .toList();

    if (needsHydration.isEmpty) return orders;

    final brandIds = {for (final o in needsHydration) o.brandId};
    final detailedById = <String, RecentOrder>{};

    await Future.wait(
      brandIds.map((bId) async {
        try {
          final brandOrders = await fetchBrandOrders(
            brandId: bId,
            page: 1,
            limit: limit,
          );
          for (final bo in brandOrders) {
            detailedById[bo.id] = bo;
          }
        } catch (_) {
          // If batch brand endpoint fails, try individual order detail below
        }
      }),
    );

    return Future.wait(
      orders.map((order) async {
        if (order.hasLoadedDetails) return order;
        final cached = detailedById[order.id];
        if (cached != null) {
          return cached.copyWith(
            brandName: order.brandName ?? cached.brandName,
          );
        }
        if (_uuidRegex.hasMatch(order.brandId) &&
            _uuidRegex.hasMatch(order.id)) {
          try {
            final detail = await fetchOrderDetail(
              brandId: order.brandId,
              orderId: order.id,
            );
            return detail.copyWith(
              brandName: order.brandName ?? detail.brandName,
            );
          } catch (_) {
            return order;
          }
        }
        return order;
      }),
    );
  }

  List<Map<String, dynamic>> _extractOrderList(Object? raw) {
    Object? listCandidate = raw;
    if (raw is Map) {
      listCandidate = raw['data'] ?? raw['orders'];
    }
    if (listCandidate is! List) {
      throw const FormatException('Invalid orders list response.');
    }
    return [
      for (final item in listCandidate)
        if (item is Map<String, dynamic>)
          item
        else if (item is Map)
          Map<String, dynamic>.from(item),
    ];
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
      403 => 'You do not have permission to view orders.',
      404 => 'Order not found.',
      _ => 'Unable to load orders. Please try again.',
    };
  }
}

final recentOrdersRepositoryProvider = Provider<RecentOrdersRepository>(
  (ref) => RecentOrdersRepository(ref.watch(dioProvider)),
);
