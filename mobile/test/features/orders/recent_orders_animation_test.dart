import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/models/user_role.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/orders/screens/orders_screen.dart';

Future<ProviderContainer> _pumpOrders(
  WidgetTester tester, {
  Size size = const Size(1200, 900),
  bool disableAnimations = false,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);

  final container = ProviderContainer(
    overrides: [
      initialTokenProvider.overrideWithValue('fixture-token'),
      initialRoleProvider.overrideWithValue(UserRole.cashierStaff),
    ],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MediaQuery(
        data: MediaQueryData(size: size, disableAnimations: disableAnimations),
        child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

void main() {
  testWidgets(
    'WT-MOB-ORDERS-ANIM-001 animates list transition and tab indicator when switching tabs',
    (tester) async {
      await _pumpOrders(tester);

      // Initially on open tab: order 1001-16330 is visible
      expect(find.text('#1001-16330'), findsOneWidget);

      // Tap Closed tab
      final closedTab = find.byKey(const Key('recent-orders-tab-closed'));
      expect(closedTab, findsOneWidget);
      await tester.tap(closedTab);

      // Advance halfway through the 240ms screen/tab transition
      await tester.pump(const Duration(milliseconds: 120));

      // AnimatedSwitcher actively runs FadeTransition and SlideTransition
      expect(find.byType(SlideTransition), findsWidgets);
      expect(find.byType(FadeTransition), findsWidgets);

      // Settle transition
      await tester.pumpAndSettle();

      // Closed orders are now fully active
      expect(find.text('#1001-16329'), findsOneWidget);
    },
  );

  testWidgets(
    'WT-MOB-ORDERS-ANIM-002 animates list transition and chip scale when switching channel filters',
    (tester) async {
      await _pumpOrders(tester);

      // Initially both Dine In (#1001-16330) and Takeaway (#1001-16331) are visible
      expect(find.text('#1001-16330'), findsOneWidget);
      expect(find.text('#1001-16331'), findsOneWidget);

      // Find and tap Takeaway filter chip
      final takeawayChip = find.widgetWithText(FilterChip, 'Takeaway');
      expect(takeawayChip, findsOneWidget);
      await tester.ensureVisible(takeawayChip);
      await tester.tap(takeawayChip, warnIfMissed: false);

      // Advance halfway through transition (240ms)
      await tester.pump(const Duration(milliseconds: 120));

      // Active slide and fade transitions during filter change
      expect(find.byType(SlideTransition), findsWidgets);
      expect(find.byType(FadeTransition), findsWidgets);

      // Settle transition
      await tester.pumpAndSettle();

      // Only Takeaway order remains; Dine In is filtered out
      expect(find.text('#1001-16331'), findsOneWidget);
      expect(find.text('#1001-16330'), findsNothing);
    },
  );

  testWidgets(
    'WT-MOB-ORDERS-ANIM-003 respects reduced motion when disableAnimations is true',
    (tester) async {
      await _pumpOrders(tester, disableAnimations: true);

      expect(find.text('#1001-16330'), findsOneWidget);

      // Tap Closed tab
      await tester.tap(find.byKey(const Key('recent-orders-tab-closed')));
      await tester.pumpAndSettle();

      // Immediately lands on Closed tab without transition delay
      expect(find.text('#1001-16329'), findsOneWidget);
    },
  );
}
