import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/availability/presentation/pages/kitchen_availability_screen.dart';
import 'package:mobile/features/availability/presentation/widgets/availability_item_card.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/pages/kitchen_board_screen.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_status_dialog.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_providers.dart';
import 'package:mobile/shared/widgets/kkfc_loading_button.dart';
import 'package:mobile/shared/widgets/logout_button.dart';

import 'order_test_driver.dart';

/// Continues the same persisted POS order through the actual kitchen UI.
/// Only the QC rejection below uses the production repository directly; it
/// deliberately checks that an external change reaches the board over SSE.
Future<void> completeKitchenFlow(
  WidgetTester tester,
  ProviderContainer container, {
  required String orderId,
  required String ticketId,
  required String ticketNumber,
  required String orderCode,
  required String persistedOrderItemId,
}) async {
  const username = String.fromEnvironment('POS_KITCHEN_USERNAME');
  const password = String.fromEnvironment('POS_KITCHEN_PASSWORD');
  expect(
    username,
    isNotEmpty,
    reason: 'Reprepare --orders fixtures for kitchen coverage.',
  );
  expect(password, isNotEmpty);

  // Return from confirmation, then change roles using the real logout/login UI.
  await orderTap(tester, find.text('New order'));
  await orderTap(tester, find.byType(LogoutButton));
  await orderTap(tester, find.text('Logout').last);
  await waitForOrderUi(
    tester,
    () => find.byType(LoginScreen).evaluate().isNotEmpty,
    'cashier logout',
  );
  await tester.enterText(find.byType(TextField).first, username);
  await tester.enterText(find.byType(TextField).last, password);
  FocusManager.instance.primaryFocus?.unfocus();
  await orderTap(tester, find.byType(KkfcLoadingButton));
  await waitForOrderUi(
    tester,
    () => find.byType(KitchenBoardScreen).evaluate().isNotEmpty,
    'kitchen login redirect',
  );

  final api = authenticatedOrderApi(container);
  final repository = container.read(kitchenBoardRepositoryProvider);
  KitchenBoardTicket? current() {
    final matches = container
        .read(kitchenBoardProvider)
        .tickets
        .where((t) => t.kitchenTicketId == ticketId);
    return matches.isEmpty ? null : matches.single;
  }

  Future<void> state(String status, String orderStatus) async {
    await waitForOrderUi(
      tester,
      () => current()?.rawStatus == status,
      'ticket $ticketId in $status',
    );
    final ticket = current()!;
    expect(ticket.orderId, orderId);
    expect(ticket.orderCode, orderCode);
    expect(ticket.data.ticketNumber, ticketNumber);
    expect(ticket.data.items.single.quantity, 2);
    final saved = await api.get<Map<String, dynamic>>(
      '/brands/$orderBrandId/orders/$orderId',
    );
    expect(saved.statusCode, 200, reason: '${saved.data}');
    expect(saved.data!['status'], orderStatus);
    expect(saved.data!['kitchen_tickets_order']['status'], status);
  }

  Finder card() => find.byKey(ValueKey('kitchen-ticket-card-$ticketNumber'));
  Future<void> open(String action) async {
    await orderTap(
      tester,
      find.descendant(of: card(), matching: find.text(action)),
    );
    expect(find.byType(KitchenTicketStatusDialog), findsOneWidget);
  }

  Future<void> advance(String action) async {
    await open(action);
    await orderTap(
      tester,
      find.descendant(
        of: find.byType(KitchenTicketStatusDialog),
        matching: find.text(action),
      ),
    );
  }

  await state('QUEUED', 'CONFIRMED');
  await advance('Acknowledge');
  await state('ACKNOWLEDGED', 'CONFIRMED');
  await advance('Start Preparing');
  await state('PREPARING', 'PREPARING');
  await advance('Send to QC');
  await state('FOR_CHECKING', 'PREPARING');

  // A real API write outside the board must appear in the running UI stream.
  final attempt = await repository.checkTicket(
    ticketId,
    checkerId: const String.fromEnvironment('POS_KITCHEN_ID'),
  );
  expect(attempt, isNotNull);
  await state('CHECKING', 'PREPARING');
  await repository.rejectQcAttempt(
    attempt!,
    rejections: [
      {
        'order_item_id': persistedOrderItemId,
        'portion_number': 1,
        'rejection_reason': 'INCOMPLETE',
        'description': 'Integration portion needs rework',
      },
    ],
  );
  await state('REWORKING', 'PREPARING');
  await open('Open rework');
  await orderTap(tester, find.text('Rework done · return to QC'));
  await state('FOR_CHECKING', 'PREPARING');

  await open('QC check');
  final passAll = find.byKey(
    const ValueKey('kitchen-ticket-dialog-action-button'),
  );
  expect(
    tester.widget<FilledButton>(passAll).onPressed,
    isNull,
    reason: 'Every item must be checked before QC approval.',
  );
  await orderTap(tester, find.text('Pass'));
  await orderTap(tester, find.text('All items passed'));
  await state('READY', 'PREPARING');

  final attempts = await api.get<List<dynamic>>('/kitchen-qc/ticket/$ticketId');
  expect(attempts.statusCode, 200);
  final history = attempts.data!;
  expect(history, hasLength(2));
  expect(history.map((a) => a['attempt_number']), unorderedEquals([1, 2]));
  expect(
    history.map((a) => a['status']),
    unorderedEquals(['FAILED', 'PASSED']),
  );

  await open('Hand over');
  final handover = find.byKey(
    const ValueKey('kitchen-ticket-handover-confirm-button'),
  );
  expect(tester.widget<FilledButton>(handover).onPressed, isNull);
  for (final label in [
    'The item matches the ticket',
    'Cutlery, napkins and condiments included',
    'Packaging sealed',
  ]) {
    await orderTap(tester, find.text(label));
  }
  await orderTap(tester, find.text('Confirm handover'));
  await waitForOrderUi(
    tester,
    () => current() == null,
    'completed ticket removed from active board',
  );
  final saved = await api.get<Map<String, dynamic>>(
    '/brands/$orderBrandId/orders/$orderId',
  );
  expect(saved.statusCode, 200);
  expect(saved.data!['status'], 'COMPLETED');
  expect(saved.data!['order_code'], orderCode);
  expect(saved.data!['kitchen_tickets_order']['kitchen_ticket_id'], ticketId);
  expect(saved.data!['kitchen_tickets_order']['status'], 'HANDED_OVER');

  // Dismiss the success dialog and visit the API-backed availability view.
  await orderTap(tester, find.text('Back to board'));
  await orderTap(
    tester,
    find.byKey(const ValueKey('kitchen-board-availability-button')),
  );
  expect(find.byType(KitchenAvailabilityScreen), findsOneWidget);
  await waitForOrderUi(
    tester,
    () => find
        .byWidgetPredicate(
          (widget) =>
              widget is AvailabilityItemCard && widget.item.id == orderItemId,
        )
        .evaluate()
        .isNotEmpty,
    'real API availability catalog',
  );
  await orderTap(tester, find.text('Kitchen Board'));
  expect(find.byType(KitchenBoardScreen), findsOneWidget);
}
