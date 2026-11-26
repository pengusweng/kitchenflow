import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/app/routes.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/pages/mobile_order_flow_screen.dart';
import 'package:mobile/features/new_order/presentation/widgets/order_flow/order_flow_stepper.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/features/order_entry/data/repositories/order_entry_repository.dart';
import 'package:mobile/shared/widgets/wave_accents.dart';

class FakeOrderEntryRepository implements OrderEntryRepository {
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
      'order_code': 'ORD-2026-1105-017',
      'order_number': 17,
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
      'order_code': 'ORD-2026-1105-017',
      'order_number': 17,
      'brand_id': brandId,
      'status': 'CONFIRMED',
      'payment_status': paymentStatus ?? 'UNPAID',
      'kitchen_tickets_order': {'ticket_number': 'T-017', 'status': 'QUEUED'},
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
    return {
      'order_id': orderId,
      'valid': true,
      'payment_method': paymentMethod,
      'payment_status': paymentStatus,
    };
  }

  @override
  Future<Map<String, dynamic>> cancelDraftOrder({
    required String brandId,
    required String orderId,
    required String cancellationReason,
  }) async {
    return {
      'order_id': orderId,
      'status': 'CANCELLED',
      'cancellation_reason': cancellationReason,
    };
  }
}

void main() {
  final sampleItem = MenuItem(
    id: 'gamcheon-samgyupsal',
    name: 'Gamcheon Samgyupsal Rice Bowl',
    description: 'Thinly sliced pork belly marinated in house gochujang sweet soy, sesame and scallions over warm rice.',
    pricesCentavos: const {
      MenuChannel.dineIn: 22000,
      MenuChannel.takeaway: 22000,
    },
    modifierGroups: [
      const ModifierGroup(
        id: 'rice-choice',
        title: 'Rice Choice',
        defaultOptionId: 'steamed-white-rice',
        options: [
          ModifierOption(
            id: 'steamed-white-rice',
            label: 'Steamed White Rice',
            priceDeltaCentavos: 0,
          ),
          ModifierOption(
            id: 'garlic-butter-rice',
            label: 'Garlic Butter Rice',
            priceDeltaCentavos: 1500,
          ),
        ],
      ),
      const ModifierGroup(
        id: 'spice-level',
        title: 'Spice Level',
        defaultOptionId: 'mild',
        options: [
          ModifierOption(
            id: 'mild',
            label: 'Mild (Touch of Sweetness)',
            priceDeltaCentavos: 0,
          ),
        ],
      ),
      ModifierGroup.addOn(
        id: 'fried-egg',
        name: 'Fried Sunny-Side Egg',
        priceCentavos: 2500,
      ),
    ],
  );

  Widget createSubject(ProviderContainer container, {GoRouter? router}) {
    if (router != null) {
      return UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(routerConfig: router),
      );
    }
    return UncontrolledProviderScope(
      container: container,
      child: const MaterialApp(home: MobileOrderFlowScreen()),
    );
  }

  testWidgets(
    'WT-MOB-ORDER-FLOW-001 MobileOrderFlowScreen starts at order details, tapping back returns to menu, steps through review and confirmation',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          orderEntryRepositoryProvider.overrideWithValue(
            FakeOrderEntryRepository(),
          ),
        ],
      );
      addTearDown(container.dispose);

      // Configure cart with 1 line, quantity 2
      container.read(cartProvider.notifier).addConfigured(sampleItem, {
        'rice-choice': 'garlic-butter-rice',
        'spice-level': 'mild',
        'fried-egg': ModifierGroup.addOnOn,
      }, 2);

      final router = GoRouter(
        initialLocation: AppRoutes.mobileOrderFlow,
        routes: [
          GoRoute(
            path: AppRoutes.menu,
            builder: (context, state) =>
                const Scaffold(body: Text('Menu Screen Target')),
          ),
          GoRoute(
            path: AppRoutes.mobileOrderFlow,
            builder: (context, state) => const MobileOrderFlowScreen(),
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(createSubject(container, router: router));
      await tester.pumpAndSettle();

      // Verify Header starts at Step 3 (Order details)
      expect(find.text('Back'), findsOneWidget);
      expect(find.text('Order details'), findsOneWidget);
      expect(find.text('Clear'), findsNothing); // Step 2 clear button is gone

      // Verify Stepper: Step 2 "Order" is removed, Details is active (displaying '2')
      expect(find.byType(OrderFlowStepper), findsOneWidget);
      expect(find.text('Order'), findsNothing);
      expect(find.text('Details'), findsOneWidget); // active step label
      expect(
        find.byKey(const ValueKey('step-1')),
        findsOneWidget,
      ); // Menu (completed)
      expect(find.byKey(const ValueKey('step-3')), findsOneWidget); // Details
      expect(find.byKey(const ValueKey('step-4')), findsOneWidget); // Review
      expect(find.byKey(const ValueKey('step-5')), findsOneWidget); // Sent
      expect(
        find.byKey(const ValueKey('step-2')),
        findsNothing,
      ); // Step 2 is removed

      // Verify Step 3 Content: Channel, Table, Payment status
      expect(find.text('Channel'), findsOneWidget);
      expect(find.text('Dine-in'), findsOneWidget);
      expect(find.text('Takeaway'), findsOneWidget);
      expect(find.text('GrabFood'), findsOneWidget);
      expect(find.text('foodpanda'), findsOneWidget);
      expect(find.text('Table'), findsOneWidget);
      expect(find.text('For example: Table 4'), findsOneWidget);
      expect(find.text('Payment status '), findsOneWidget);
      expect(find.text('Unpaid'), findsOneWidget);
      expect(find.text('Review order'), findsOneWidget);

      // Verify tapping "Back" on Step 3 returns to the menu screen
      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Menu Screen Target'), findsOneWidget);

      // Return to order flow
      router.go(AppRoutes.mobileOrderFlow);
      await tester.pumpAndSettle();
      expect(find.text('Order details'), findsOneWidget);

      // Test validation: tapping "Review order" without table triggers error
      await tester.tap(find.text('Review order'));
      await tester.pumpAndSettle();

      expect(
        find.text('Enter the table before reviewing a dine-in order.'),
        findsOneWidget,
      );
      expect(find.text('Table is required.'), findsOneWidget);

      // Enter table reference to satisfy validation
      await tester.enterText(find.byType(TextField), 'Table 7');
      await tester.pumpAndSettle();

      // Error banner should be cleared
      expect(
        find.text('Enter the table before reviewing a dine-in order.'),
        findsNothing,
      );

      // Proceed: Step 3 -> Step 4 (Review order)
      await tester.tap(find.text('Review order'));
      await tester.pumpAndSettle();

      // Verify Step 4 "Review order"
      expect(find.text('Review order'), findsOneWidget);
      expect(find.text('Review'), findsOneWidget); // active stepper label
      expect(
        find.text('Not sent yet. Please review carefully before confirming.'),
        findsOneWidget,
      );
      expect(find.text('Gamcheon'), findsOneWidget); // Brand grouping header
      expect(find.text('Gamcheon Samgyupsal Rice Bowl'), findsOneWidget);
      expect(find.text('Table 7'), findsOneWidget);
      expect(find.text('1 line · 2 items'), findsOneWidget);
      expect(find.text('2×'), findsOneWidget);
      expect(find.text('Confirm and send'), findsOneWidget);
      expect(find.text('Cancel order'), findsOneWidget);

      // Test Back from Step 4 returns to Step 3
      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Order details'), findsOneWidget);

      // Re-advance to Step 4
      await tester.tap(find.text('Review order'));
      await tester.pumpAndSettle();
      expect(find.text('Review order'), findsOneWidget);

      // Proceed: Step 4 -> Step 5 (Kitchen ticket confirmed)
      await tester.tap(find.text('Confirm and send'));
      await tester.pumpAndSettle();

      // Verify Step 5 "Sent"
      expect(find.text('Sent'), findsOneWidget);
      expect(find.text('Kitchen ticket confirmed'), findsOneWidget);
      expect(find.text('Kitchen ticket'), findsOneWidget);
      expect(find.text('T-017'), findsOneWidget);
      expect(find.text('ORD-2026-1105-017'), findsOneWidget);
      expect(find.text('New order'), findsOneWidget);
      expect(find.text('Cancel order'), findsNothing);

      // Verify cart and table reference cleared
      expect(container.read(cartProvider), isEmpty);
      expect(container.read(orderReferenceProvider), isEmpty);
    },
  );

  testWidgets(
    'WT-MOB-ORDER-FLOW-002 MobileOrderFlowScreen renders background canvas wave accents and header wave arcs across steps',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          orderEntryRepositoryProvider.overrideWithValue(
            FakeOrderEntryRepository(),
          ),
        ],
      );
      addTearDown(container.dispose);

      container.read(cartProvider.notifier).add(sampleItem);

      await tester.pumpWidget(createSubject(container));
      await tester.pumpAndSettle();

      // 1. Verifies the fluid background canvas waves from the design system are present
      expect(find.byType(KkfcCanvasWaves), findsOneWidget);
      final canvasWaves = find.byWidgetPredicate(
        (widget) =>
            widget is CustomPaint && widget.painter is CanvasWavesPainter,
      );
      expect(canvasWaves, findsOneWidget);

      // 2. Verifies the navy header copper wave arcs are present
      final headerWaves = find.byWidgetPredicate(
        (widget) =>
            widget is CustomPaint && widget.painter is HeaderWavesPainter,
      );
      expect(headerWaves, findsOneWidget);

      // 3. Enter table reference and advance to Step 4 (Review order), verifying waves remain visible
      await tester.enterText(find.byType(TextField), 'Table 1');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Review order'));
      await tester.pumpAndSettle();

      expect(find.byType(KkfcCanvasWaves), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
