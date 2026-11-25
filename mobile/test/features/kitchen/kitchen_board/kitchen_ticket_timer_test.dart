import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_dialog_header.dart';
import 'package:mobile/shared/data/models/kitchen_ticket_data.dart';
import 'package:mobile/shared/widgets/kitchen_ticket_card/kitchen_ticket_card.dart';
import 'package:mobile/shared/widgets/kitchen_ticket_card/kitchen_ticket_header.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

void main() {
  group('Kitchen Ticket Timer Thresholds', () {
    test('KkfcKitchen threshold constants are set to 15 and 30 minutes', () {
      expect(KkfcKitchen.ageCautionMin, 15);
      expect(KkfcKitchen.ageLateMin, 30);
    });

    test('KitchenBoardTicket.ageFromElapsed correctly categorizes durations', () {
      // Below 15 mins is still early / green (onTime)
      expect(
        KitchenBoardTicket.ageFromElapsed(Duration.zero),
        KitchenTicketAge.onTime,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 5)),
        KitchenTicketAge.onTime,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 14, seconds: 59)),
        KitchenTicketAge.onTime,
      );

      // 15 to 20 mins and up to 30 mins is yellow (dueSoon)
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 15)),
        KitchenTicketAge.dueSoon,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 15, seconds: 30)),
        KitchenTicketAge.dueSoon,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 20)),
        KitchenTicketAge.dueSoon,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 25)),
        KitchenTicketAge.dueSoon,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 29, seconds: 59)),
        KitchenTicketAge.dueSoon,
      );

      // 30 mins and above is considered late or red (late)
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 30)),
        KitchenTicketAge.late,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(minutes: 35)),
        KitchenTicketAge.late,
      );
      expect(
        KitchenBoardTicket.ageFromElapsed(const Duration(hours: 1)),
        KitchenTicketAge.late,
      );
    });

    test('Color tokens provide green for early, yellow for caution, red for late', () {
      expect(KkfcColors.ticketAgeOnTime, const Color(0xFF16A34A));
      expect(KkfcColors.ticketAgeDueSoon, const Color(0xFFD97706));
      expect(KkfcColors.ticketAgeLate, const Color(0xFFDC2626));
    });

    test('KitchenTicketHeader.formatElapsed formats minutes and seconds cleanly', () {
      expect(KitchenTicketHeader.formatElapsed(Duration.zero), '0:00');
      expect(KitchenTicketHeader.formatElapsed(const Duration(seconds: 45)), '0:45');
      expect(KitchenTicketHeader.formatElapsed(const Duration(minutes: 14, seconds: 9)), '14:09');
      expect(KitchenTicketHeader.formatElapsed(const Duration(minutes: 20)), '20:00');
      expect(KitchenTicketHeader.formatElapsed(const Duration(minutes: 30, seconds: 5)), '30:05');
      // Negative protection
      expect(KitchenTicketHeader.formatElapsed(const Duration(seconds: -10)), '0:00');
    });
  });

  group('Kitchen Ticket Live Timer Widget', () {
    testWidgets('timer counts up live and ticks upwards every second', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: KitchenTicketHeader(
              ticketNumber: 'T-001',
              elapsed: Duration(minutes: 2, seconds: 30),
              age: KitchenTicketAge.onTime,
              isLive: true,
            ),
          ),
        ),
      );

      expect(find.text('2:30'), findsOneWidget);

      // Advance by 1 second
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('2:31'), findsOneWidget);

      // Advance by 5 more seconds
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('2:36'), findsOneWidget);
    });

    testWidgets('timer dynamically transitions to yellow dueSoon at 15 minutes', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: KitchenTicketHeader(
              ticketNumber: 'T-002',
              elapsed: Duration(minutes: 14, seconds: 59),
              age: KitchenTicketAge.onTime,
              isLive: true,
            ),
          ),
        ),
      );

      // At 14:59, still early/green, no DUE SOON cue visible
      expect(find.text('14:59'), findsOneWidget);
      expect(find.byKey(const ValueKey('kitchen-ticket-age-cue')), findsNothing);

      // Advance 1 second to 15:00
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('15:00'), findsOneWidget);
      expect(find.byKey(const ValueKey('kitchen-ticket-age-cue')), findsOneWidget);
      expect(find.text('DUE SOON'), findsOneWidget);
    });

    testWidgets('timer dynamically transitions to red late at 30 minutes', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: KitchenTicketHeader(
              ticketNumber: 'T-003',
              elapsed: Duration(minutes: 29, seconds: 59),
              age: KitchenTicketAge.dueSoon,
              isLive: true,
            ),
          ),
        ),
      );

      expect(find.text('29:59'), findsOneWidget);
      expect(find.text('DUE SOON'), findsOneWidget);

      // Advance 1 second to 30:00
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('30:00'), findsOneWidget);
      expect(find.text('LATE'), findsOneWidget);
    });

    testWidgets('KitchenTicketCard integrates live timer and ticks upwards', (tester) async {
      final ticket = KitchenTicketData(
        ticketNumber: 'T-099',
        elapsed: const Duration(seconds: 58),
        age: KitchenTicketAge.onTime,
        status: KkfcStatus.preparing,
        channel: 'Dine-in',
        reference: 'Table 1',
        brand: const AssignedBrand(id: 'brand-kk', code: 'KK', name: 'King Kungs Kafé'),
        items: const [
          KitchenTicketItem(quantity: 1, name: 'Burger'),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketCard(
              ticket: ticket,
              isLive: true,
            ),
          ),
        ),
      );

      expect(find.text('0:58'), findsOneWidget);

      await tester.pump(const Duration(seconds: 2));
      expect(find.text('1:00'), findsOneWidget);
    });

    testWidgets('KitchenTicketDialogHeader integrates live timer and ticks upwards', (tester) async {
      final boardTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-1',
        orderId: 'order-1',
        orderCode: 'ORD-001',
        lane: KitchenBoardLane.preparing,
        rawStatus: 'PREPARING',
        data: const KitchenTicketData(
          ticketNumber: 'T-042',
          elapsed: Duration(minutes: 5, seconds: 10),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.preparing,
          channel: 'Takeaway',
          reference: 'Call: Sam',
          brand: AssignedBrand(id: 'brand-kk', code: 'KK', name: 'King Kungs Kafé'),
          items: [KitchenTicketItem(quantity: 1, name: 'Latte')],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketDialogHeader(
              ticket: boardTicket,
              statusLabel: 'Preparing',
              isLive: true,
            ),
          ),
        ),
      );

      expect(find.text('5:10'), findsOneWidget);

      await tester.pump(const Duration(seconds: 3));
      expect(find.text('5:13'), findsOneWidget);
    });
  });
}
