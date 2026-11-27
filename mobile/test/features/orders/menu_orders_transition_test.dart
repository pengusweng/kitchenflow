import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/router.dart';
import 'package:mobile/app/routes.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/auth/token_store.dart';
import 'package:mobile/core/models/user_role.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/new_order/data/seed/sample_menu.dart';
import 'package:mobile/features/new_order/presentation/pages/menu_screen.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/features/orders/screens/orders_screen.dart';

class _MemoryTokenStore extends TokenStore {
  @override
  Future<void> clear() async {}
}

void main() {
  testWidgets(
    'WT-MOB-TRANSITION-001 animates forward from MenuScreen to OrdersScreen and reverse back to MenuScreen',
    (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final container = ProviderContainer(
        overrides: [
          initialTokenProvider.overrideWithValue('fixture-token'),
          tokenStoreProvider.overrideWithValue(_MemoryTokenStore()),
          initialRoleProvider.overrideWithValue(UserRole.cashierStaff),
          menuItemsProvider.overrideWith((ref) async => sampleMenu),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);
      router.go(AppRoutes.menu);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(theme: counterTheme, routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      // 1. Initially MenuScreen is present
      expect(find.byType(MenuScreen), findsOneWidget);
      expect(find.byType(OrdersScreen), findsNothing);

      // 2. Tap floating Recent Orders button to navigate forward
      final recentOrdersButton = find.byKey(
        const ValueKey('recent-orders-floating-button'),
      );
      expect(recentOrdersButton, findsOneWidget);
      await tester.tap(recentOrdersButton);
      await tester.pump();

      // Advance halfway through the 320ms entrance animation
      await tester.pump(const Duration(milliseconds: 160));

      // Both screens exist during transition with active slide and fade
      expect(find.byType(OrdersScreen), findsOneWidget);
      expect(find.byType(SlideTransition), findsWidgets);
      expect(find.byType(FadeTransition), findsWidgets);

      // Settle transition
      await tester.pumpAndSettle();

      // OrdersScreen is now fully active
      expect(find.byType(OrdersScreen), findsOneWidget);

      // 3. Tap the top-left back button to navigate in reverse back to menu
      final backButton = find.byKey(
        const ValueKey('recent-orders-back-button'),
      );
      expect(backButton, findsOneWidget);
      await tester.tap(backButton);
      await tester.pump();

      // Advance halfway through the 240ms exit animation
      await tester.pump(const Duration(milliseconds: 120));

      // Both screens participate in reverse transition
      expect(find.byType(OrdersScreen), findsOneWidget);
      expect(find.byType(MenuScreen), findsOneWidget);

      // Settle reverse transition
      await tester.pumpAndSettle();

      // MenuScreen is restored
      expect(find.byType(MenuScreen), findsOneWidget);
      expect(find.byType(OrdersScreen), findsNothing);
    },
  );

  testWidgets(
    'WT-MOB-TRANSITION-002 respects reduced motion when animations are disabled',
    (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final container = ProviderContainer(
        overrides: [
          initialTokenProvider.overrideWithValue('fixture-token'),
          tokenStoreProvider.overrideWithValue(_MemoryTokenStore()),
          initialRoleProvider.overrideWithValue(UserRole.cashierStaff),
          menuItemsProvider.overrideWith((ref) async => sampleMenu),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);
      router.go(AppRoutes.menu);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: MaterialApp.router(
              theme: counterTheme,
              routerConfig: router,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(MenuScreen), findsOneWidget);

      // Tap Recent Orders button
      await tester.tap(
        find.byKey(const ValueKey('recent-orders-floating-button')),
      );
      await tester.pumpAndSettle();

      // Immediately lands on OrdersScreen without transition delays
      expect(find.byType(OrdersScreen), findsOneWidget);
    },
  );
}
