import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_dialog_header.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_past_qc_attempts_card.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_qc_view.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_rework_view.dart';
import 'package:mobile/shared/data/models/kitchen_ticket_data.dart';
import 'package:mobile/shared/widgets/kitchen_ticket_card/kitchen_ticket_card.dart';
import 'package:mobile/shared/widgets/kitchen_ticket_card/kitchen_ticket_header.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

class _MockQcAdapter implements HttpClientAdapter {
  _MockQcAdapter(this.handler);

  final ResponseBody Function(RequestOptions options) handler;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

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

  group('Kitchen Ticket Multi-Brand Display (Option A)', () {
    const brandKk = AssignedBrand(id: 'brand-kk', code: 'KK', name: 'King Kungs Kafé');
    const brandAi = AssignedBrand(id: 'brand-ai', code: 'AI', name: "Aurelia's Inasal");
    const brandGc = AssignedBrand(id: 'brand-gc', code: 'GC', name: 'Gamcheon');

    testWidgets('single-brand ticket displays standard single brand row', (tester) async {
      final ticket = KitchenTicketData(
        ticketNumber: 'T-010',
        elapsed: const Duration(minutes: 1),
        age: KitchenTicketAge.onTime,
        status: KkfcStatus.queued,
        channel: 'Dine-in',
        reference: 'Table 1',
        brand: brandKk,
        items: const [KitchenTicketItem(quantity: 1, name: 'Latte')],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketCard(ticket: ticket),
          ),
        ),
      );

      expect(find.byKey(const ValueKey('kitchen-ticket-brand-row-single')), findsOneWidget);
      expect(find.byKey(const ValueKey('kitchen-ticket-brand-row-multi')), findsNothing);
      expect(find.text('KK'), findsOneWidget);
      expect(find.text('King Kungs Kafé'), findsOneWidget);
    });

    testWidgets('multi-brand ticket displays header badges for all order brands in KitchenTicketCard', (tester) async {
      final multiBrandTicket = KitchenTicketData(
        ticketNumber: 'T-020',
        elapsed: const Duration(minutes: 3),
        age: KitchenTicketAge.onTime,
        status: KkfcStatus.preparing,
        channel: 'Takeaway',
        reference: 'Call: Ana',
        brand: brandKk,
        brands: const [brandKk, brandAi, brandGc],
        items: const [
          KitchenTicketItem(quantity: 1, name: 'Iced Latte'),
          KitchenTicketItem(quantity: 1, name: 'Inasal Pecho'),
          KitchenTicketItem(quantity: 1, name: 'Samgyupsal Bowl'),
        ],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketCard(ticket: multiBrandTicket),
          ),
        ),
      );

      expect(find.byKey(const ValueKey('kitchen-ticket-brand-row-multi')), findsOneWidget);
      expect(find.byKey(const ValueKey('kitchen-ticket-brand-row-single')), findsNothing);

      // Verify all brand codes and names are present on the card header
      expect(find.text('KK'), findsOneWidget);
      expect(find.text('King Kungs Kafé'), findsOneWidget);
      expect(find.text('AI'), findsOneWidget);
      expect(find.text("Aurelia's Inasal"), findsOneWidget);
      expect(find.text('GC'), findsOneWidget);
      expect(find.text('Gamcheon'), findsOneWidget);
    });

    testWidgets('multi-brand ticket displays header badges in KitchenTicketDialogHeader', (tester) async {
      final boardTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-multi',
        orderId: 'order-multi',
        orderCode: 'ORD-999',
        lane: KitchenBoardLane.preparing,
        rawStatus: 'PREPARING',
        data: const KitchenTicketData(
          ticketNumber: 'T-030',
          elapsed: Duration(minutes: 7),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.preparing,
          channel: 'GrabFood',
          reference: '#GF-2002',
          brand: brandKk,
          brands: [brandKk, brandAi],
          items: [
            KitchenTicketItem(quantity: 2, name: 'Coffee'),
            KitchenTicketItem(quantity: 1, name: 'Chicken'),
          ],
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketDialogHeader(
              ticket: boardTicket,
              statusLabel: 'Preparing',
            ),
          ),
        ),
      );

      expect(find.byKey(const ValueKey('kitchen-ticket-brand-row-multi')), findsOneWidget);
      expect(find.text('KK'), findsOneWidget);
      expect(find.text('King Kungs Kafé'), findsOneWidget);
      expect(find.text('AI'), findsOneWidget);
      expect(find.text("Aurelia's Inasal"), findsOneWidget);
    });

    test('KitchenBoardTicket.tryFromApiJson parses multiple brands from API payload', () {
      final json = {
        'kitchen_ticket_id': 'ticket-json-1',
        'order_id': 'order-json-1',
        'order_code': 'ORD-MULTI-01',
        'ticket_number': 'T-050',
        'status': 'QUEUED',
        'brands': [
          {'code': 'KK', 'name': 'King Kungs Kafé', 'brand_id': 'brand-kk'},
          {'code': 'AI', 'name': "Aurelia's Inasal", 'brand_id': 'brand-ai'},
        ],
        'items': [
          {'quantity': 1, 'name': 'Coffee'},
        ],
      };

      final parsed = KitchenBoardTicket.tryFromApiJson(json);
      expect(parsed, isNotNull);
      expect(parsed!.data.effectiveBrands.length, 2);
      expect(parsed.data.effectiveBrands[0].code, 'KK');
      expect(parsed.data.effectiveBrands[1].code, 'AI');
      expect(parsed.data.isMultiBrand, isTrue);
    });

    test('KitchenBoardTicket.tryFromApiJson extracts multiple brands from order item metadata', () {
      final json = {
        'kitchen_ticket_id': 'ticket-json-2',
        'order_id': 'order-json-2',
        'order_code': 'ORD-MULTI-02',
        'ticket_number': 'T-051',
        'status': 'QUEUED',
        'items': [
          {
            'quantity': 1,
            'name': 'Bulgogi Bowl',
            'brand': {'code': 'GC', 'name': 'Gamcheon', 'id': 'brand-gc'},
          },
          {
            'quantity': 1,
            'name': 'Inasal Leg',
            'brand_code': 'AI',
            'brand_name': "Aurelia's Inasal",
          },
        ],
      };

      final parsed = KitchenBoardTicket.tryFromApiJson(json);
      expect(parsed, isNotNull);
      expect(parsed!.data.effectiveBrands.length, 2);
      expect(parsed.data.effectiveBrands[0].code, 'GC');
      expect(parsed.data.effectiveBrands[1].code, 'AI');
      expect(parsed.data.isMultiBrand, isTrue);
    });
  });

  group('Kitchen Ticket Card Action & Details Styling', () {
    testWidgets('Details button has underline style with spacing', (tester) async {
      const ticket = KitchenTicketData(
        ticketNumber: 'T-099',
        elapsed: Duration(minutes: 5),
        age: KitchenTicketAge.onTime,
        status: KkfcStatus.acknowledged,
        channel: 'Dine-in',
        reference: '#ORD-99',
        brand: AssignedBrand(id: 'brand-kk', code: 'KK', name: 'King Kungs'),
        items: [KitchenTicketItem(quantity: 1, name: 'Burger')],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketCard(
              ticket: ticket,
              onDetails: () {},
              onAction: () {},
            ),
          ),
        ),
      );

      final detailsFinder = find.text('Details');
      expect(detailsFinder, findsOneWidget);

      final containerFinder = find.ancestor(
        of: detailsFinder,
        matching: find.byType(Container),
      );
      expect(containerFinder, findsWidgets);

      final underlineBox = tester.widget<Container>(containerFinder.first);
      final decoration = underlineBox.decoration as BoxDecoration?;
      expect(decoration?.border?.bottom, isNotNull);
      expect(decoration!.border!.bottom.color, KkfcColors.ticketSubtleInk);

      final padding = underlineBox.padding as EdgeInsets?;
      expect(padding?.bottom, greaterThan(0));
    });

    testWidgets('Start Preparing CTA does not wrap to 2 lines on acknowledged ticket across narrow constraints', (tester) async {
      const ticket = KitchenTicketData(
        ticketNumber: 'T-099',
        elapsed: Duration(minutes: 5),
        age: KitchenTicketAge.onTime,
        status: KkfcStatus.acknowledged,
        channel: 'Dine-in',
        reference: '#ORD-99',
        brand: AssignedBrand(id: 'brand-kk', code: 'KK', name: 'King Kungs'),
        items: [KitchenTicketItem(quantity: 1, name: 'Burger')],
      );

      // Test on standard minimum lane width (280px) and a very narrow screen (240px)
      for (final width in [280.0, 240.0]) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Center(
                child: SizedBox(
                  width: width,
                  child: KitchenTicketCard.board(
                    ticket: ticket,
                    onDetails: () {},
                    onAction: () {},
                  ),
                ),
              ),
            ),
          ),
        );

        final ctaFinder = find.text('Start Preparing');
        expect(ctaFinder, findsOneWidget);

        final ctaText = tester.widget<Text>(ctaFinder);
        expect(ctaText.maxLines, 1);
        expect(ctaText.softWrap, false);

        // Verify it is wrapped in a FittedBox with BoxFit.scaleDown
        final fittedBoxFinder = find.ancestor(
          of: ctaFinder,
          matching: find.byType(FittedBox),
        );
        expect(fittedBoxFinder, findsOneWidget);
        final fittedBox = tester.widget<FittedBox>(fittedBoxFinder);
        expect(fittedBox.fit, BoxFit.scaleDown);

        // Verify the rendered line count is 1
        final renderParagraph = tester.renderObject<RenderParagraph>(ctaFinder);
        final textPainter = TextPainter(
          text: renderParagraph.text,
          textDirection: TextDirection.ltr,
          maxLines: 1,
        )..layout(maxWidth: renderParagraph.constraints.maxWidth);
        expect(textPainter.computeLineMetrics().length, 1);
      }
    });
  });

  group('Kitchen Ticket Past QC Attempts (GET /api/kitchen-qc/ticket/{ticketId})', () {
    final sampleApiPayload = [
      {
        'qc_attempt_id': 'attempt-2',
        'kitchen_ticket_id': 'ticket-100',
        'attempt_number': 2,
        'checker_id': 'checker-1',
        'status': 'FAILED',
        'started_at': '2026-11-25T13:15:00.000Z',
        'completed_at': '2026-11-25T13:16:00.000Z',
        'checker': {'first_name': 'Maria', 'last_name': 'Santos'},
        'rejections': [
          {
            'rejection_id': 'rej-2',
            'order_item_id': 'item-1',
            'portion_number': 2,
            'rejection_reason': 'OTHER',
            'description': 'Sauce spilled on rim',
            'rejected_at': '2026-11-25T13:16:00.000Z',
          },
        ],
      },
      {
        'qc_attempt_id': 'attempt-1',
        'kitchen_ticket_id': 'ticket-100',
        'attempt_number': 1,
        'checker_id': 'checker-2',
        'status': 'FAILED',
        'started_at': '2026-11-25T13:05:00.000Z',
        'completed_at': '2026-11-25T13:06:00.000Z',
        'checker': {'first_name': 'Juan', 'last_name': 'Dela Cruz'},
        'rejections': [
          {
            'rejection_id': 'rej-1',
            'order_item_id': 'item-1',
            'portion_number': 1,
            'rejection_reason': 'OTHER',
            'description': 'Rice portion short; plate again',
            'rejected_at': '2026-11-25T13:06:00.000Z',
          },
        ],
      },
    ];

    test('fetchTicketQcAttempts calls GET /api/kitchen-qc/ticket/{ticketId} and parses attempts descending', () async {
      final adapter = _MockQcAdapter((options) {
        return ResponseBody.fromString(
          jsonEncode(sampleApiPayload),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost:3000/api'))
        ..httpClientAdapter = adapter;
      final repo = KitchenBoardRepository(dio);

      final attempts = await repo.fetchTicketQcAttempts('ticket-100');

      expect(adapter.requests.length, 1);
      expect(adapter.requests.first.method, 'GET');
      expect(adapter.requests.first.path, '/kitchen-qc/ticket/ticket-100');

      expect(attempts.length, 2);
      expect(attempts[0].attemptNumber, 2);
      expect(attempts[0].checkerName, 'Maria Santos');
      expect(attempts[0].isFailed, isTrue);
      expect(attempts[0].rejections.first.portionNumber, 2);
      expect(attempts[0].rejections.first.displayReason, 'Sauce spilled on rim');

      expect(attempts[1].attemptNumber, 1);
      expect(attempts[1].checkerName, 'Juan Dela Cruz');
      expect(attempts[1].rejections.first.displayReason, 'Rice portion short; plate again');
    });

    testWidgets('Rework and QC views display past QC attempts card with attempt history and item rejections', (tester) async {
      final attempts = KitchenQcAttempt.parseList(sampleApiPayload);
      final baseTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-100',
        orderId: 'order-100',
        orderCode: 'AI-100',
        lane: KitchenBoardLane.rework,
        rawStatus: 'REWORKING',
        data: const KitchenTicketData(
          ticketNumber: 'T-100',
          elapsed: Duration(minutes: 10),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.reworking,
          channel: 'Dine-in',
          reference: 'Table 5',
          brand: AssignedBrand(id: 'brand-ai', code: 'AI', name: "Aurelia's Inasal"),
          items: [
            KitchenTicketItem(
              quantity: 2,
              name: 'Paa Inasal',
              orderItemId: 'item-1',
            ),
          ],
        ),
      ).applyQcAttempts(attempts);

      // 1. Verify applyQcAttempts enriched the latest failReason on the item
      expect(baseTicket.data.items.first.failReason, 'Portion 2: Sauce spilled on rim');
      expect(baseTicket.pastQcAttempts.length, 2);

      // 2. Render in Rework view
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketReworkView(
              ticket: baseTicket,
              isActionLoading: false,
              isActionEnabled: true,
              onReworkDone: (_) async {},
            ),
          ),
        ),
      );

      expect(find.byType(KitchenTicketPastQcAttemptsCard), findsOneWidget);
      expect(find.text('Past QC attempts'), findsOneWidget);
      expect(find.text('Attempt #2'), findsOneWidget);
      expect(find.text('Attempt #1'), findsOneWidget);
      expect(find.textContaining('Checked by Maria Santos'), findsOneWidget);
      expect(find.textContaining('Checked by Juan Dela Cruz'), findsOneWidget);
      expect(find.text('Paa Inasal — Portion 2: Sauce spilled on rim'), findsOneWidget);
      expect(find.text('Paa Inasal — Portion 1: Rice portion short; plate again'), findsOneWidget);

      // 3. Render in QC Check view (when ticket returns to QC for attempt #3)
      final qcTicket = baseTicket.copyWith(
        rawStatus: 'CHECKING',
        lane: KitchenBoardLane.qcCheck,
        data: baseTicket.data.copyWith(status: KkfcStatus.checking),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: KitchenTicketQcView(
              ticket: qcTicket,
              isActionLoading: false,
              isActionEnabled: true,
              onPass: () {},
            ),
          ),
        ),
      );

      expect(find.byType(KitchenTicketPastQcAttemptsCard), findsOneWidget);
      expect(find.text('Past QC attempts'), findsOneWidget);
      expect(find.text('Attempt #2'), findsOneWidget);
      expect(find.text('Attempt #1'), findsOneWidget);
    });
  });
}
