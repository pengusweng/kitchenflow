import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/order_flow/review_order_step_view.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/features/order_entry/data/repositories/order_entry_repository.dart';

class _FakeOrderEntryRepository implements OrderEntryRepository {
  @override
  Future<Map<String, dynamic>> createOrder({
    required String brandId,
    required String orderId,
    required MenuChannel channel,
    required List<CartLine> lines,
    String? reference,
    String? merchantStoreReference,
    String? notes,
  }) async {
    return {
      'order_id': orderId,
      'order_code': 'ORD-TEST-001',
      'order_number': 1,
      'brand_id': brandId,
      'order_channel': channel.apiValue,
      'table_reference': reference,
      'status': 'DRAFT',
      'payment_status': 'UNPAID',
    };
  }

  @override
  Future<Map<String, dynamic>> confirmOrder({
    required String brandId,
    required String orderId,
    String? paymentMethod,
    String? paymentStatus,
    String? paymentReference,
  }) async {
    return {
      'order_id': orderId,
      'order_code': 'ORD-TEST-001',
      'order_number': 1,
      'brand_id': brandId,
      'status': 'CONFIRMED',
      'payment_status': paymentStatus ?? 'UNPAID',
      'kitchen_tickets_order': {'ticket_number': 'T-001', 'status': 'QUEUED'},
    };
  }

  @override
  Future<Map<String, dynamic>> verifyOrder({
    required String brandId,
    required String orderId,
    String? paymentMethod,
    String? paymentStatus,
    String? paymentReference,
  }) async {
    return {'order_id': orderId, 'valid': true};
  }

  @override
  Future<Map<String, dynamic>> cancelDraftOrder({
    required String brandId,
    required String orderId,
    required String cancellationReason,
  }) async {
    return {'order_id': orderId, 'status': 'CANCELLED'};
  }
}

void main() {
  const brandGc = AssignedBrand(id: 'brand-gc', code: 'GC', name: 'Gamcheon');

  const brandAi = AssignedBrand(
    id: 'brand-ai',
    code: 'AI',
    name: "Aurelia's Inasal",
  );

  final gcItem = MenuItem(
    id: 'gc-samgyup',
    name: 'Gamcheon Samgyupsal Rice Bowl',
    description: 'Pork belly bowl',
    pricesCentavos: const {MenuChannel.dineIn: 22000},
    modifierGroups: [
      const ModifierGroup(
        id: 'rice',
        title: 'Rice Choice',
        defaultOptionId: 'white-rice',
        options: [
          ModifierOption(
            id: 'white-rice',
            label: 'White Rice',
            priceDeltaCentavos: 0,
          ),
          ModifierOption(
            id: 'kimchi-rice',
            label: 'Kimchi Rice',
            priceDeltaCentavos: 3000,
          ),
        ],
      ),
    ],
  );

  final aiItem = MenuItem(
    id: 'ai-inasal',
    name: 'Chicken Inasal Pecho',
    description: 'Grilled chicken',
    pricesCentavos: const {MenuChannel.dineIn: 18000},
  );

  Widget createSubject(ProviderContainer container) {
    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        home: Scaffold(
          body: ReviewOrderStepView(
            onConfirm: () {},
            cooldownDuration: Duration.zero,
          ),
        ),
      ),
    );
  }

  testWidgets(
    'WT-MOB-REVIEW-BRAND-001 Step 4: Separates and labels menu items by brand in a multi-brand order',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          assignedBrandsProvider.overrideWithValue([brandGc, brandAi]),
          orderEntryRepositoryProvider.overrideWithValue(
            _FakeOrderEntryRepository(),
          ),
        ],
      );
      addTearDown(container.dispose);

      // Add 2 Gamcheon items and 1 Aurelia's Inasal item
      final cartNotifier = container.read(cartProvider.notifier);
      cartNotifier.state = [
        CartLine(
          id: 'line-gc-1',
          brandId: brandGc.id,
          brandName: brandGc.name,
          item: gcItem,
          quantity: 2,
          selections: const {
            'rice': 'kimchi-rice',
          }, // +30 PHP -> 250 each * 2 = 500
        ),
        CartLine(
          id: 'line-ai-1',
          brandId: brandAi.id,
          brandName: brandAi.name,
          item: aiItem,
          quantity: 1, // 180
        ),
      ];

      await tester.pumpWidget(createSubject(container));
      await tester.pumpAndSettle();

      // 1. Verify summary card header
      expect(find.text('2 lines · 3 items'), findsOneWidget);

      // 2. Verify Gamcheon Brand Section Header
      final gcHeaderFinder = find.byKey(
        const ValueKey('review-brand-group-gc'),
      );
      expect(gcHeaderFinder, findsOneWidget);
      expect(
        find.descendant(of: gcHeaderFinder, matching: find.text('GC')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: gcHeaderFinder, matching: find.text('Gamcheon')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: gcHeaderFinder, matching: find.text('(2 items)')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: gcHeaderFinder, matching: find.text('₱500.00')),
        findsOneWidget,
      );

      // 3. Verify Aurelia's Inasal Brand Section Header
      final aiHeaderFinder = find.byKey(
        const ValueKey('review-brand-group-ai'),
      );
      expect(aiHeaderFinder, findsOneWidget);
      expect(
        find.descendant(of: aiHeaderFinder, matching: find.text('AI')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: aiHeaderFinder,
          matching: find.text("Aurelia's Inasal"),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: aiHeaderFinder, matching: find.text('(1 item)')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: aiHeaderFinder, matching: find.text('₱180.00')),
        findsOneWidget,
      );

      // 4. Verify lines appear under their respective brands
      expect(find.text('Gamcheon Samgyupsal Rice Bowl'), findsOneWidget);
      expect(find.text('Kimchi Rice (+₱30)'), findsOneWidget);
      expect(find.text('2×'), findsOneWidget);

      expect(find.text('Chicken Inasal Pecho'), findsOneWidget);
      expect(find.text('1×'), findsOneWidget);

      // 5. Verify Subtotal and Total reflect both brands (500 + 180 = 680)
      expect(find.text('₱680.00'), findsNWidgets(2)); // Subtotal & Total
    },
  );

  testWidgets(
    'WT-MOB-REVIEW-BRAND-002 Step 4: Labels single-brand order with clean brand group header',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          assignedBrandsProvider.overrideWithValue([brandGc]),
          orderEntryRepositoryProvider.overrideWithValue(
            _FakeOrderEntryRepository(),
          ),
        ],
      );
      addTearDown(container.dispose);

      final cartNotifier = container.read(cartProvider.notifier);
      cartNotifier.state = [
        CartLine(
          id: 'line-gc-1',
          brandId: brandGc.id,
          brandName: brandGc.name,
          item: gcItem,
          quantity: 1,
        ),
      ];

      await tester.pumpWidget(createSubject(container));
      await tester.pumpAndSettle();

      expect(find.text('1 line · 1 item'), findsOneWidget);
      final gcHeader = find.byKey(const ValueKey('review-brand-group-gc'));
      expect(gcHeader, findsOneWidget);
      expect(
        find.descendant(of: gcHeader, matching: find.text('Gamcheon')),
        findsOneWidget,
      );
      expect(find.text('₱220.00'), findsWidgets);
    },
  );

  testWidgets(
    'WT-MOB-REVIEW-BRAND-003 Step 4: Pressing Confirm and send clears the cart',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          assignedBrandsProvider.overrideWithValue([brandGc]),
          orderEntryRepositoryProvider.overrideWithValue(
            _FakeOrderEntryRepository(),
          ),
        ],
      );
      addTearDown(container.dispose);

      final cartNotifier = container.read(cartProvider.notifier);
      cartNotifier.state = [
        CartLine(
          id: 'line-gc-1',
          brandId: brandGc.id,
          brandName: brandGc.name,
          item: gcItem,
          quantity: 2,
        ),
      ];

      expect(container.read(cartProvider).length, 1);

      container.read(orderReferenceProvider.notifier).set('Table 42');
      expect(container.read(orderReferenceProvider), 'Table 42');

      bool confirmed = false;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: Scaffold(
              body: ReviewOrderStepView(
                onConfirm: () => confirmed = true,
                cooldownDuration: Duration.zero,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap "Confirm and send"
      await tester.tap(find.byKey(const ValueKey('confirm-and-send-button')));
      await tester.pumpAndSettle();

      // Callback invoked
      expect(confirmed, isTrue);

      // Cart and table input are now cleared!
      expect(container.read(cartProvider), isEmpty);
      expect(container.read(orderReferenceProvider), isEmpty);
    },
  );
}
