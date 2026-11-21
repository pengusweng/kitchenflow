import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/pages/mobile_order_flow_screen.dart';
import 'package:mobile/features/new_order/presentation/widgets/order_flow/review_order_step_view.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/features/order_entry/data/repositories/order_entry_repository.dart';

class _FakeActiveBrandNotifier extends ActiveBrandNotifier {
  _FakeActiveBrandNotifier(this._brand);
  final AssignedBrand _brand;
  @override
  AssignedBrand build() => _brand;
}

class _MockOrderEntryRepository implements OrderEntryRepository {
  int createCallCount = 0;
  int confirmCallCount = 0;

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
    createCallCount++;
    return {
      'order_id': orderId,
      'order_code': 'GC-00042',
      'order_number': 42,
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
    confirmCallCount++;
    return {
      'order_id': orderId,
      'order_code': 'GC-00042',
      'order_number': 42,
      'brand_id': brandId,
      'status': 'CONFIRMED',
      'payment_status': paymentStatus ?? 'UNPAID',
      'kitchen_tickets_order': {'ticket_number': 'T-042', 'status': 'QUEUED'},
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
  TestWidgetsFlutterBinding.ensureInitialized();

  final sampleBrand = AssignedBrand(
    id: '44444444-4444-4444-8444-444444444444',
    code: 'GC',
    name: 'Gamcheon',
  );

  final sampleItem = MenuItem(
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Gamcheon Samgyupsal Rice Bowl',
    description: 'Pork belly over rice',
    pricesCentavos: const {MenuChannel.dineIn: 26000},
  );

  group('ReviewOrderStepView 3-second cooldown and loading bar', () {
    testWidgets(
      'confirm button is muted and disabled with loading bar for 3s before becoming enabled',
      (tester) async {
        bool confirmed = false;

        final mockRepo = _MockOrderEntryRepository();
        final container = ProviderContainer(
          overrides: [
            activeBrandProvider.overrideWith(
              () => _FakeActiveBrandNotifier(sampleBrand),
            ),
            assignedBrandsProvider.overrideWithValue([sampleBrand]),
            orderEntryRepositoryProvider.overrideWithValue(mockRepo),
          ],
        );
        addTearDown(container.dispose);

        container.read(cartProvider.notifier).add(sampleItem);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              home: Scaffold(
                body: ReviewOrderStepView(
                  onConfirm: () => confirmed = true,
                  cooldownDuration: const Duration(seconds: 3),
                ),
              ),
            ),
          ),
        );

        // Initial pump: review view rendered
        await tester.pump();

        // 1. Loading bar must be visible
        expect(
          find.byKey(const ValueKey('confirm-cooldown-progress-bar')),
          findsOneWidget,
        );
        expect(find.byType(LinearProgressIndicator), findsOneWidget);

        // 2. Button is rendered with muted color and tapping is disabled
        final buttonFinder = find.byKey(const ValueKey('confirm-and-send-button'));
        expect(buttonFinder, findsOneWidget);

        await tester.tap(buttonFinder);
        await tester.pump();
        expect(confirmed, isFalse, reason: 'Confirm should not fire during cooldown');

        // Advance 1.5 seconds: still cooling down
        await tester.pump(const Duration(milliseconds: 1500));
        expect(
          find.byKey(const ValueKey('confirm-cooldown-progress-bar')),
          findsOneWidget,
        );
        await tester.tap(buttonFinder);
        await tester.pump();
        expect(confirmed, isFalse);

        // Advance remaining 1.5 seconds: cooldown completes
        await tester.pump(const Duration(milliseconds: 1500));
        await tester.pump(const Duration(milliseconds: 50));

        // 3. Loading bar is gone
        expect(
          find.byKey(const ValueKey('confirm-cooldown-progress-bar')),
          findsNothing,
        );

        // 4. Button is now enabled: tapping confirms the order
        await tester.tap(buttonFinder);
        await tester.pump();
        expect(confirmed, isTrue, reason: 'Confirm should fire after 3-second cooldown');
      },
    );

    testWidgets(
      'order flow: clicking review order in step 3 triggers 3-second disabled confirm button and loading bar',
      (tester) async {
        final mockRepo = _MockOrderEntryRepository();
        final container = ProviderContainer(
          overrides: [
            activeBrandProvider.overrideWith(
              () => _FakeActiveBrandNotifier(sampleBrand),
            ),
            assignedBrandsProvider.overrideWithValue([sampleBrand]),
            orderEntryRepositoryProvider.overrideWithValue(mockRepo),
          ],
        );
        addTearDown(container.dispose);

        // Put an item in cart
        container.read(cartProvider.notifier).add(sampleItem);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(
              home: MobileOrderFlowScreen(initialStep: 3),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Step 3: Enter Dine-in Table and tap "Review order"
        await tester.enterText(find.byType(TextField), 'Table 12');
        await tester.pumpAndSettle();

        await tester.tap(find.text('Review order'));
        await tester.pump(); // Start navigation to Step 4
        await tester.pump(const Duration(milliseconds: 300)); // Finish slide transition

        // We are now in Step 4 Review Order
        expect(find.text('Review order'), findsWidgets);
        expect(find.text('Confirm and send'), findsOneWidget);

        // Confirm button is cooling down: loading bar is visible
        expect(
          find.byKey(const ValueKey('confirm-cooldown-progress-bar')),
          findsOneWidget,
        );

        // Attempting to tap confirm immediately does nothing
        await tester.tap(find.text('Confirm and send'));
        await tester.pump();
        expect(mockRepo.confirmCallCount, 0);

        // After 3 seconds of cooldown, the loading bar disappears and confirm becomes interactive
        await tester.pump(const Duration(seconds: 3));
        await tester.pump();

        expect(
          find.byKey(const ValueKey('confirm-cooldown-progress-bar')),
          findsNothing,
        );

        // Now tap Confirm and send -> successfully confirms and navigates to Step 5
        await tester.tap(find.text('Confirm and send'));
        await tester.pumpAndSettle();

        expect(mockRepo.confirmCallCount, 1);
        expect(find.text('Kitchen ticket confirmed'), findsOneWidget);
      },
    );
  });
}
