import 'dart:async';

import 'package:dio/dio.dart';
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
import 'package:mobile/features/orders/data/models/recent_order.dart';
import 'package:mobile/features/orders/data/repositories/recent_orders_repository.dart';
import 'package:mobile/features/orders/data/seed/sample_recent_orders.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_orders_skeleton.dart';
import 'package:mobile/features/orders/screens/orders_screen.dart';

class _FakeTokenStore extends TokenStore {
  @override
  Future<void> clear() async {}
}

class _ControllableRecentOrdersRepository extends RecentOrdersRepository {
  _ControllableRecentOrdersRepository(this.completer) : super(Dio());

  Completer<List<RecentOrder>> completer;
  int fetchCount = 0;

  @override
  Future<List<RecentOrder>> fetchRecentOrders({
    String? brandId,
    CancelToken? cancelToken,
    int limit = 20,
    int page = 1,
    String? paymentStatus,
    String? search,
    String? status,
  }) async {
    fetchCount++;
    return completer.future;
  }
}

void main() {
  group('RecentOrdersListSkeleton', () {
    testWidgets('renders default 6 skeleton cards with shimmer and semantics', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: counterTheme,
          home: const Scaffold(body: RecentOrdersListSkeleton()),
        ),
      );

      // Verify accessible semantics label
      expect(find.bySemanticsLabel('Loading recent orders'), findsOneWidget);

      // Advance animation slightly to verify shimmer renders
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.byType(RecentOrdersListSkeleton), findsOneWidget);
      expect(find.byType(RecentOrderCardSkeleton), findsNWidgets(6));
      expect(
        find.byKey(const ValueKey('recent-order-skeleton-card-0')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('recent-order-skeleton-card-5')),
        findsOneWidget,
      );
    });

    testWidgets('renders specified itemCount of skeleton cards', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: counterTheme,
          home: const Scaffold(body: RecentOrdersListSkeleton(itemCount: 4)),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(RecentOrdersListSkeleton), findsOneWidget);
      expect(find.byType(RecentOrderCardSkeleton), findsNWidgets(4));
    });

    testWidgets('respects disableAnimations / reduceMotion without throwing', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: counterTheme,
          home: const MediaQuery(
            data: MediaQueryData(disableAnimations: true),
            child: Scaffold(body: RecentOrdersListSkeleton()),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 200));
      expect(find.byType(RecentOrdersListSkeleton), findsOneWidget);
    });
  });

  group('Screen switch reload & skeleton integration', () {
    testWidgets(
      'switching from MenuScreen to OrdersScreen reloads recent orders and displays skeleton loading',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 900);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        var completer = Completer<List<RecentOrder>>();
        final repo = _ControllableRecentOrdersRepository(completer);

        final container = ProviderContainer(
          overrides: [
            initialTokenProvider.overrideWithValue('fixture-token'),
            tokenStoreProvider.overrideWithValue(_FakeTokenStore()),
            initialRoleProvider.overrideWithValue(UserRole.cashierStaff),
            menuItemsProvider.overrideWith((ref) async => sampleMenu),
            recentOrdersRepositoryProvider.overrideWithValue(repo),
          ],
        );
        addTearDown(container.dispose);

        final router = container.read(routerProvider);
        router.go(AppRoutes.menu);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp.router(
              theme: counterTheme,
              routerConfig: router,
            ),
          ),
        );
        await tester.pumpAndSettle();

        // 1. Initially MenuScreen is present
        expect(find.byType(MenuScreen), findsOneWidget);
        expect(find.byType(OrdersScreen), findsNothing);

        // Complete any initial microtask fetch from provider build
        if (!completer.isCompleted) {
          completer.complete(createSampleRecentOrders());
          await tester.pumpAndSettle();
        }

        final initialCount = repo.fetchCount;

        // Reset completer for the screen switch
        completer = Completer<List<RecentOrder>>();
        repo.completer = completer;

        // 2. Tap floating Recent Orders button to navigate to OrdersScreen
        final recentOrdersButton = find.byKey(
          const ValueKey('recent-orders-floating-button'),
        );
        expect(recentOrdersButton, findsOneWidget);
        await tester.tap(recentOrdersButton);
        await tester.pump();

        // Advance into the transition
        await tester.pump(const Duration(milliseconds: 160));

        // OrdersScreen is mounted and reload was triggered!
        expect(repo.fetchCount, greaterThan(initialCount));
        expect(find.byType(OrdersScreen), findsOneWidget);

        // Skeleton loading is actively displayed while completer is pending!
        expect(find.byType(RecentOrdersListSkeleton), findsOneWidget);

        // 3. Complete reload with fresh orders
        final freshOrders = [
          RecentOrder(
            id: 'ord-reload-999',
            brandId: 'brand-1',
            orderCode: 'ORD-999-RELOAD',
            ticketNumber: '#999-RELOAD',
            channel: 'Dine In',
            tableOrPickup: 'Table 12',
            orderStatus: 'CONFIRMED',
            statusLabel: 'Received',
            tab: RecentOrderTab.open,
            totalCentavos: 88800,
            paymentStatus: 'UNPAID',
            createdAt: DateTime.now(),
            items: const [],
          ),
        ];
        completer.complete(freshOrders);
        await tester.pumpAndSettle();

        // Skeleton is now replaced by loaded orders
        expect(find.byType(RecentOrdersListSkeleton), findsNothing);
        expect(find.text('#999-RELOAD'), findsOneWidget);
        expect(find.text('Dine In'), findsWidgets);
      },
    );
  });
}
