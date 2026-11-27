import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';
import 'package:mobile/features/orders/data/repositories/recent_orders_repository.dart';
import 'package:mobile/features/orders/screens/orders_screen.dart';

typedef _Handler = ResponseBody Function(RequestOptions options);

class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this._handler);

  final _Handler _handler;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return _handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonResponse(int statusCode, Map<String, dynamic> body) {
  return ResponseBody.fromString(
    jsonEncode(body),
    statusCode,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

const _brandId = '11111111-1111-4111-8111-111111111111';
const _unpaidOrderId = '22222222-2222-4222-8222-222222222222';
const _paidOrderId = '33333333-3333-4333-8333-333333333333';
const _closedOrderId = '44444444-4444-4444-8444-444444444444';

Map<String, dynamic> _buildFullOrderJson({
  required String orderId,
  required String orderCode,
  required String channel,
  required String status,
  required String paymentStatus,
  String? tableReference,
  String? externalReference,
  String? ticketNumber,
  String? ticketStatus,
  String? notes,
  required List<Map<String, dynamic>> items,
}) {
  return {
    'order_id': orderId,
    'order_number': 1,
    'order_code': orderCode,
    'order_date': '2026-11-27T00:00:00.000Z',
    'brand_id': _brandId,
    'created_by_id': '55555555-5555-4555-8555-555555555555',
    'order_channel': channel,
    'merchant_store_reference': externalReference != null ? 'STORE-01' : null,
    'external_order_reference': externalReference,
    'table_reference': tableReference,
    'status': status,
    'payment_status': paymentStatus,
    'notes': notes,
    'cancelled_by_id': null,
    'cancellation_reason': null,
    'cancelled_at': null,
    'confirmed_at': '2026-11-27T04:05:00.000Z',
    'completed_at': status == 'COMPLETED' ? '2026-11-27T04:25:00.000Z' : null,
    'created_at': '2026-11-27T04:00:00.000Z',
    'modified_at': '2026-11-27T04:05:00.000Z',
    'order_items_order': items,
    'kitchen_tickets_order': ticketNumber == null
        ? null
        : {
            'kitchen_ticket_id': '66666666-6666-4666-8666-666666666666',
            'order_id': orderId,
            'order_code': orderCode,
            'ticket_number': ticketNumber,
            'status': ticketStatus ?? 'PREPARING',
            'created_by_id': '55555555-5555-4555-8555-555555555555',
            'created_at': '2026-11-27T04:05:00.000Z',
            'modified_at': '2026-11-27T04:05:00.000Z',
          },
  };
}

void main() {
  test('UT-MOB-ORDERS-REPO-001 fetches summary rows from GET /orders and hydrates line items and ticket from GET /brands/:brandId/orders', () async {
    final adapter = _StubAdapter((options) {
      if (options.path == '/orders') {
        return _jsonResponse(200, {
          'data': [
            {
              'order_id': _unpaidOrderId,
              'order_number': 1,
              'order_code': 'GC-00001',
              'order_date': '2026-11-27T00:00:00.000Z',
              'brand_id': _brandId,
              'created_by_id': '55555555-5555-4555-8555-555555555555',
              'order_channel': 'DINE_IN',
              'table_reference': '12',
              'external_order_reference': null,
              'status': 'PREPARING',
              'payment_status': 'UNPAID',
              'notes': 'Serve hot',
              'created_at': '2026-11-27T04:00:00.000Z',
              'modified_at': '2026-11-27T04:05:00.000Z',
              'brand': {'brand_id': _brandId, 'code': 'GC', 'name': 'Gamcheon'},
            },
          ],
          'meta': {
            'page': 1,
            'limit': 50,
            'total': 1,
            'totalPages': 1,
            'counts': {
              'all': 1,
              'DRAFT': 0,
              'CONFIRMED': 0,
              'PREPARING': 1,
              'COMPLETED': 0,
              'CANCELLED': 0,
            },
          },
        });
      }

      if (options.path == '/brands/$_brandId/orders') {
        return _jsonResponse(200, {
          'orders': [
            _buildFullOrderJson(
              orderId: _unpaidOrderId,
              orderCode: 'GC-00001',
              channel: 'DINE_IN',
              status: 'PREPARING',
              paymentStatus: 'UNPAID',
              tableReference: '12',
              ticketNumber: 'T-001',
              ticketStatus: 'PREPARING',
              notes: 'Serve hot',
              items: [
                {
                  'order_item_id': '77777777-7777-4777-8777-777777777777',
                  'order_id': _unpaidOrderId,
                  'menu_item_id': '88888888-8888-4888-8888-888888888888',
                  'item_name': 'Yangnyeom Chicken Boneless',
                  'quantity': 2,
                  'unit_price': '185.00',
                  'notes': 'Extra sauce on the side',
                  'order_item_modifiers_order_item': [
                    {
                      'order_item_modifier_id':
                          '99999999-9999-4999-8999-999999999999',
                      'order_item_id': '77777777-7777-4777-8777-777777777777',
                      'modifier_id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                      'modifier_name': 'Add Cheese Dip',
                      'additional_price': '25.00',
                    },
                  ],
                },
              ],
            ),
          ],
          'total': 1,
        });
      }

      return _jsonResponse(404, {'message': 'Not found'});
    });

    final dio = Dio()..httpClientAdapter = adapter;
    final repo = RecentOrdersRepository(dio);

    final orders = await repo.fetchRecentOrders();

    expect(orders, hasLength(1));
    final order = orders.first;
    expect(order.id, _unpaidOrderId);
    expect(order.brandId, _brandId);
    expect(order.brandName, 'Gamcheon');
    expect(order.orderCode, 'GC-00001');
    expect(order.ticketNumber, 'T-001');
    expect(order.channel, 'Dine In');
    expect(order.tableOrPickup, 'Table 12');
    expect(order.tab, RecentOrderTab.unpaid);
    expect(order.statusLabel, 'Preparing in kitchen');
    // 2 * (185.00 + 25.00) = 420.00 PHP = 42000 centavos
    expect(order.totalCentavos, 42000);
    expect(order.items, hasLength(1));
    expect(order.items.first.name, 'Yangnyeom Chicken Boneless');
    expect(order.items.first.modifiers, ['Add Cheese Dip']);
    expect(order.items.first.notes, ['Extra sauce on the side']);
  });

  testWidgets(
    'WT-MOB-ORDERS-API-001 renders live backend orders across Unpaid, Paid, and Closed tabs without non-backend components',
    (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final adapter = _StubAdapter((options) {
        return _jsonResponse(200, {
          'data': [
            _buildFullOrderJson(
              orderId: _unpaidOrderId,
              orderCode: 'GC-00101',
              channel: 'DINE_IN',
              status: 'CONFIRMED',
              paymentStatus: 'UNPAID',
              tableReference: '8',
              ticketNumber: 'T-101',
              ticketStatus: 'QUEUED',
              items: [
                {
                  'order_item_id': '77777777-7777-4777-8777-777777777101',
                  'order_id': _unpaidOrderId,
                  'menu_item_id': '88888888-8888-4888-8888-888888888101',
                  'item_name': 'Gamcheon Soy Garlic Wings',
                  'quantity': 1,
                  'unit_price': '240.00',
                  'notes': 'Crispy',
                  'order_item_modifiers_order_item': [],
                },
              ],
            ),
            _buildFullOrderJson(
              orderId: _paidOrderId,
              orderCode: 'GC-00102',
              channel: 'GRABFOOD',
              status: 'PREPARING',
              paymentStatus: 'PAID',
              externalReference: 'GF-5501',
              ticketNumber: 'T-102',
              ticketStatus: 'PREPARING',
              items: [
                {
                  'order_item_id': '77777777-7777-4777-8777-777777777102',
                  'order_id': _paidOrderId,
                  'menu_item_id': '88888888-8888-4888-8888-888888888102',
                  'item_name': 'Bulgogi Rice Bowl',
                  'quantity': 1,
                  'unit_price': '195.00',
                  'notes': null,
                  'order_item_modifiers_order_item': [],
                },
              ],
            ),
            _buildFullOrderJson(
              orderId: _closedOrderId,
              orderCode: 'GC-00103',
              channel: 'TAKEAWAY',
              status: 'COMPLETED',
              paymentStatus: 'PAID',
              ticketNumber: 'T-103',
              ticketStatus: 'HANDED_OVER',
              items: [
                {
                  'order_item_id': '77777777-7777-4777-8777-777777777103',
                  'order_id': _closedOrderId,
                  'menu_item_id': '88888888-8888-4888-8888-888888888103',
                  'item_name': 'Kimchi Pancake',
                  'quantity': 1,
                  'unit_price': '150.00',
                  'notes': null,
                  'order_item_modifiers_order_item': [],
                },
              ],
            ),
          ],
        });
      });

      final dio = Dio()..httpClientAdapter = adapter;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            recentOrdersRepositoryProvider.overrideWithValue(
              RecentOrdersRepository(dio),
            ),
          ],
          child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
        ),
      );
      await tester.pumpAndSettle();

      // 1. Default Unpaid tab displays backend order GC-00101 (Ticket T-101)
      expect(find.text('T-101'), findsOneWidget);
      expect(find.text('Order GC-00101'), findsOneWidget);
      expect(find.text('Table 8'), findsOneWidget);
      expect(find.text('Gamcheon Soy Garlic Wings'), findsOneWidget);
      expect(find.text('Total:'), findsOneWidget);

      // Non-backend components do not exist
      expect(find.text('Subtotal:'), findsNothing);
      expect(find.text('Tax (VAT / 8.5%):'), findsNothing);
      expect(find.textContaining('Server:'), findsNothing);
      expect(find.textContaining('Last Modified:'), findsNothing);
      expect(find.textContaining('Due'), findsNothing);

      // 2. Switch to Paid tab -> displays GC-00102 (Ticket T-102)
      await tester.tap(find.byKey(const Key('recent-orders-tab-paid')));
      await tester.pumpAndSettle();

      expect(find.text('T-102'), findsOneWidget);
      expect(find.text('Order GC-00102'), findsOneWidget);
      expect(find.text('Order #GF-5501'), findsOneWidget);
      expect(find.text('Bulgogi Rice Bowl'), findsOneWidget);

      // 3. Switch to Closed tab -> displays GC-00103 (Ticket T-103)
      await tester.tap(find.byKey(const Key('recent-orders-tab-closed')));
      await tester.pumpAndSettle();

      expect(find.text('T-103'), findsOneWidget);
      expect(find.text('Order GC-00103'), findsOneWidget);
      expect(find.text('Kimchi Pancake'), findsOneWidget);
      expect(find.text('Cancel Order'), findsNothing);
    },
  );
}
