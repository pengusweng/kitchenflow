import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_lane.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/repositories/kitchen_board_repository.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_enricher.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/shared/widgets/kitchen_ticket_card/kitchen_ticket_card.dart';
import 'package:mobile/shared/widgets/status_badge/kkfc_status.dart';

class _FakeKitchenBoardRepository extends Fake
    implements KitchenBoardRepository {
  @override
  Future<List<KitchenQcAttempt>> fetchTicketQcAttempts(String ticketId) async =>
      [];

  @override
  Future<Map<String, dynamic>?> fetchOrder({
    required String brandId,
    required String orderId,
  }) async => null;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const brandGc = AssignedBrand(
    id: '00000000-0000-4000-8000-000000000001',
    code: 'GC',
    name: 'Gamcheon',
  );
  const brandAi = AssignedBrand(
    id: '00000000-0000-4000-8000-000000000002',
    code: 'AI',
    name: "Aurelia's Inasal",
  );
  const brandKk = AssignedBrand(
    id: '00000000-0000-4000-8000-000000000003',
    code: 'KK',
    name: 'King Kungs Kafé',
  );

  setUp(() {
    KitchenBoardEnricher.clearCatalogCache();
  });

  group('Kitchen Ticket Item Model', () {
    test('UT-MOB-KITCHEN-BRAND-001 KitchenTicketItem stores and copies menuItemId correctly', () {
      const item = KitchenTicketItem(
        quantity: 1,
        name: 'Paa Inasal',
        menuItemId: 'menu-item-123',
      );
      expect(item.menuItemId, 'menu-item-123');

      final copied = item.copyWith(name: 'Pecho Inasal');
      expect(copied.name, 'Pecho Inasal');
      expect(copied.menuItemId, 'menu-item-123');

      final modified = item.copyWith(menuItemId: 'menu-item-456');
      expect(modified.menuItemId, 'menu-item-456');
    });
  });

  group('Static Catalog & Keyword Resolution in KitchenBoardTicket', () {
    test('UT-MOB-KITCHEN-BRAND-002 tryFromApiJson resolves multi-brand from item names without brand tags', () {
      final json = {
        'kitchen_ticket_id': 'ticket-multi-static-1',
        'order_id': 'order-1',
        'order_code': 'ORD-2026-001',
        'ticket_number': 'T-101',
        'status': 'QUEUED',
        'items': [
          {'name': 'Gamcheon Samgyupsal Rice Bowl', 'quantity': 1},
          {'name': 'Paa Inasal', 'quantity': 2},
        ],
      };

      final ticket = KitchenBoardTicket.tryFromApiJson(json);
      expect(ticket, isNotNull);
      expect(ticket!.data.isMultiBrand, isTrue);
      expect(ticket.data.effectiveBrands.length, 2);

      final codes = ticket.data.effectiveBrands.map((b) => b.code).toSet();
      expect(codes, containsAll(['GC', 'AI']));
    });

    test('UT-MOB-KITCHEN-BRAND-003 tryFromApiJson leaves single brand when all items belong to same brand', () {
      final json = {
        'kitchen_ticket_id': 'ticket-single-static-1',
        'order_id': 'order-2',
        'order_code': 'ORD-AI-002',
        'ticket_number': 'T-102',
        'status': 'QUEUED',
        'items': [
          {'name': 'Paa Inasal', 'quantity': 1},
          {'name': 'Pecho Inasal', 'quantity': 1},
        ],
      };

      final ticket = KitchenBoardTicket.tryFromApiJson(json);
      expect(ticket, isNotNull);
      expect(ticket!.data.isMultiBrand, isFalse);
      expect(ticket.data.effectiveBrands.length, 1);
      expect(ticket.data.effectiveBrands.first.code, 'AI');
    });
  });

  group('Dynamic Catalog Enrichment in KitchenBoardEnricher', () {
    test('UT-MOB-KITCHEN-BRAND-004 enrichTicketsWithOrders resolves multi-brand using dynamic menu catalog', () async {
      final repo = _FakeKitchenBoardRepository();

      const item1Id = 'item-uuid-gc-1';
      const item2Id = 'item-uuid-ai-1';

      final rawTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-dynamic-1',
        orderId: 'order-dynamic-1',
        orderCode: 'ORD-KK-001',
        lane: KitchenBoardLane.queued,
        rawStatus: 'QUEUED',
        sentToKitchenLabel: '10:00 AM',
        preparationStartedLabel: 'Not started',
        data: const KitchenTicketData(
          ticketNumber: 'T-201',
          elapsed: Duration.zero,
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.queued,
          channel: 'Dine-in',
          reference: 'Table 1',
          brand: brandKk,
          items: [
            KitchenTicketItem(
              quantity: 1,
              name: 'Special Bowl',
              menuItemId: item1Id,
            ),
            KitchenTicketItem(
              quantity: 1,
              name: 'House Chicken',
              menuItemId: item2Id,
            ),
          ],
        ),
      );

      final enriched = await KitchenBoardEnricher.enrichTicketsWithOrders(
        repo: repo,
        tickets: [rawTicket],
        prevMap: {},
        isMounted: () => true,
        getBrands: () async => [brandGc, brandAi, brandKk],
        getMenuItems: (brandId) async {
          if (brandId == brandGc.id) {
            return [
              const MenuItem(
                id: item1Id,
                name: 'Special Bowl',
                description: '',
                pricesCentavos: {},
              ),
            ];
          }
          if (brandId == brandAi.id) {
            return [
              const MenuItem(
                id: item2Id,
                name: 'House Chicken',
                description: '',
                pricesCentavos: {},
              ),
            ];
          }
          return [];
        },
      );

      expect(enriched.first.data.isMultiBrand, isTrue);
      expect(enriched.first.data.effectiveBrands.length, 2);
      final codes = enriched.first.data.effectiveBrands
          .map((b) => b.code)
          .toSet();
      expect(codes, containsAll(['GC', 'AI']));
    });

    test('UT-MOB-KITCHEN-BRAND-005 preserveEnrichedDetails preserves multi-brand data across stream refreshes', () {
      final prevTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-preserve-1',
        orderId: 'order-preserve-1',
        orderCode: 'ORD-PRESERVE-01',
        lane: KitchenBoardLane.preparing,
        rawStatus: 'PREPARING',
        sentToKitchenLabel: '11:00 AM',
        preparationStartedLabel: '11:02 AM',
        data: const KitchenTicketData(
          ticketNumber: 'T-301',
          elapsed: Duration(minutes: 2),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.preparing,
          channel: 'Takeaway',
          reference: 'Call: Mike',
          brand: brandGc,
          brands: [brandGc, brandAi],
          items: [],
        ),
      );

      final freshTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-preserve-1',
        orderId: 'order-preserve-1',
        orderCode: 'ORD-PRESERVE-01',
        lane: KitchenBoardLane.preparing,
        rawStatus: 'PREPARING',
        sentToKitchenLabel: '11:00 AM',
        preparationStartedLabel: '11:02 AM',
        data: const KitchenTicketData(
          ticketNumber: 'T-301',
          elapsed: Duration(minutes: 3),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.preparing,
          channel: 'Takeaway',
          reference: 'Call: Mike',
          brand: brandGc,
          brands: [brandGc], // Stream briefly only had single brand
          items: [],
        ),
      );

      final preserved = KitchenBoardEnricher.preserveEnrichedDetails(
        [freshTicket],
        {prevTicket.kitchenTicketId: prevTicket},
      );

      expect(preserved.first.data.isMultiBrand, isTrue);
      expect(preserved.first.data.effectiveBrands.length, 2);
      expect(preserved.first.data.effectiveBrands[0].code, 'GC');
      expect(preserved.first.data.effectiveBrands[1].code, 'AI');
    });
  });

  group('Kitchen Ticket UI Multi-Brand Badges', () {
    testWidgets(
      'WT-MOB-KITCHEN-BRAND-006 KitchenTicketCard displays multi-brand badge row when ticket is multi-brand',
      (tester) async {
        const multiBrandTicket = KitchenTicketData(
          ticketNumber: 'T-401',
          elapsed: Duration(minutes: 5),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.preparing,
          channel: 'Dine-in',
          reference: 'Table 7',
          brand: brandGc,
          brands: [brandGc, brandAi],
          items: [
            KitchenTicketItem(quantity: 1, name: 'Bulgogi Bowl'),
            KitchenTicketItem(quantity: 1, name: 'Paa Inasal'),
          ],
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: KitchenTicketCard(ticket: multiBrandTicket)),
          ),
        );

        // Brands at the top are removed on multi-brand cards
        expect(
          find.byKey(const ValueKey('kitchen-ticket-brand-row-multi')),
          findsNothing,
        );
        expect(
          find.byKey(const ValueKey('kitchen-ticket-brand-row-single')),
          findsNothing,
        );
        expect(find.text('Gamcheon'), findsWidgets);
        expect(find.text("Aurelia's Inasal"), findsWidgets);

        // Verify that items are arranged and labeled by brand
        expect(
          find.byKey(const ValueKey('kitchen-ticket-brand-group-gc')),
          findsOneWidget,
        );
        expect(
          find.byKey(const ValueKey('kitchen-ticket-brand-group-ai')),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'WT-MOB-KITCHEN-BRAND-007 KitchenTicketCard displays single brand row without group headers when ticket has only 1 brand',
      (tester) async {
        const singleBrandTicket = KitchenTicketData(
          ticketNumber: 'T-402',
          elapsed: Duration(minutes: 2),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.queued,
          channel: 'Takeaway',
          reference: 'Call: Sarah',
          brand: brandKk,
          brands: [brandKk],
          items: [KitchenTicketItem(quantity: 1, name: 'Iced Spanish Latte')],
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: KitchenTicketCard(ticket: singleBrandTicket)),
          ),
        );

        expect(
          find.byKey(const ValueKey('kitchen-ticket-brand-row-single')),
          findsOneWidget,
        );
        expect(
          find.byKey(const ValueKey('kitchen-ticket-brand-row-multi')),
          findsNothing,
        );
        expect(find.text('King Kungs Kafé'), findsOneWidget);
        expect(
          find.byKey(const ValueKey('kitchen-ticket-brand-group-kk')),
          findsNothing,
        );
      },
    );

    test('UT-MOB-KITCHEN-BRAND-008 Items in KitchenTicketData are arranged contiguously by brand', () {
      final ticket = const KitchenTicketData(
        ticketNumber: 'T-501',
        elapsed: Duration.zero,
        age: KitchenTicketAge.onTime,
        status: KkfcStatus.queued,
        channel: 'Dine-in',
        reference: 'Table 2',
        brand: brandGc,
        brands: [brandGc, brandAi],
        items: [
          KitchenTicketItem(quantity: 1, name: 'Bulgogi Bowl', brand: brandGc),
          KitchenTicketItem(quantity: 1, name: 'Paa Inasal', brand: brandAi),
          KitchenTicketItem(
            quantity: 1,
            name: 'Kimchi Pancake',
            brand: brandGc,
          ),
        ],
      ).withItemsArrangedByBrand();

      final groups = ticket.brandItemGroups;
      expect(groups.length, 2);
      expect(groups[0].brand.code, 'GC');
      expect(groups[0].items.length, 2);
      expect(groups[0].items[0].name, 'Bulgogi Bowl');
      expect(groups[0].items[1].name, 'Kimchi Pancake');

      expect(groups[1].brand.code, 'AI');
      expect(groups[1].items.length, 1);
      expect(groups[1].items[0].name, 'Paa Inasal');
    });

    test('UT-MOB-KITCHEN-BRAND-009 preserveEnrichedDetails preserves item-level brand assignments and does not merge under 1 brand', () {
      // 1. Initial enriched ticket in state
      const enrichedTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-multi-ack',
        orderId: 'order-multi-ack',
        orderCode: 'ORD-ACK-01',
        lane: KitchenBoardLane.queued,
        rawStatus: 'QUEUED',
        data: KitchenTicketData(
          ticketNumber: 'T-901',
          elapsed: Duration(minutes: 1),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.queued,
          channel: 'Takeaway',
          reference: 'Call: Ana',
          brand: brandKk,
          brands: [brandKk, brandAi],
          items: [
            KitchenTicketItem(
              quantity: 1,
              name: 'House Blend Coffee',
              orderItemId: 'oi-1',
              menuItemId: 'mi-coffee',
              brand: brandKk,
            ),
            KitchenTicketItem(
              quantity: 1,
              name: 'Chicken Inasal Rice',
              orderItemId: 'oi-2',
              menuItemId: 'mi-inasal',
              brand: brandAi,
            ),
          ],
        ),
      );

      final prevMap = {enrichedTicket.kitchenTicketId: enrichedTicket};

      // 2. Incoming raw ticket from GET /api/kitchen-ticket/today after Acknowledge action
      // Server returns ticket with ACKNOWLEDGED status, but items have no brand assigned
      const rawAcknowledgedTicket = KitchenBoardTicket(
        kitchenTicketId: 'ticket-multi-ack',
        orderId: 'order-multi-ack',
        orderCode: 'ORD-ACK-01',
        lane: KitchenBoardLane.acknowledged,
        rawStatus: 'ACKNOWLEDGED',
        data: KitchenTicketData(
          ticketNumber: 'T-901',
          elapsed: Duration(minutes: 1),
          age: KitchenTicketAge.onTime,
          status: KkfcStatus.acknowledged,
          channel: 'Takeaway',
          reference: 'Call: Ana',
          brand: brandKk, // Only primary brand
          brands: null,
          items: [
            KitchenTicketItem(
              quantity: 1,
              name: 'House Blend Coffee',
              orderItemId: 'oi-1',
              menuItemId: 'mi-coffee',
              brand: null, // Raw API item has no brand
            ),
            KitchenTicketItem(
              quantity: 1,
              name: 'Chicken Inasal Rice',
              orderItemId: 'oi-2',
              menuItemId: 'mi-inasal',
              brand: null, // Raw API item has no brand
            ),
          ],
        ),
      );

      final preserved = KitchenBoardEnricher.preserveEnrichedDetails([
        rawAcknowledgedTicket,
      ], prevMap);

      expect(preserved.length, 1);
      final ticket = preserved.first;

      // Status should be the new status (ACKNOWLEDGED)
      expect(ticket.rawStatus, 'ACKNOWLEDGED');
      expect(ticket.lane, KitchenBoardLane.acknowledged);

      // Brands must be preserved
      expect(ticket.data.isMultiBrand, isTrue);
      expect(ticket.data.effectiveBrands.length, 2);
      expect(
        ticket.data.effectiveBrands.map((b) => b.code),
        containsAll(['KK', 'AI']),
      );

      // Each item must retain its brand
      expect(ticket.data.items[0].brand?.code, 'KK');
      expect(ticket.data.items[1].brand?.code, 'AI');

      // Crucially, items must NOT be merged under 1 brand
      final groups = ticket.data.brandItemGroups;
      expect(
        groups.length,
        2,
        reason: 'Must maintain 2 separate brand groups, not merge into 1',
      );
      expect(groups[0].brand.code, 'KK');
      expect(groups[0].items.length, 1);
      expect(groups[0].items[0].name, 'House Blend Coffee');

      expect(groups[1].brand.code, 'AI');
      expect(groups[1].items.length, 1);
      expect(groups[1].items[0].name, 'Chicken Inasal Rice');
    });
  });
}
