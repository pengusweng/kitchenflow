import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/app/router.dart';
import 'package:mobile/app/routes.dart';
import 'package:mobile/core/models/user_role.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/availability/providers/availability_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/shared/widgets/app_header.dart';
import 'package:mobile/shared/widgets/logout_button.dart';
import 'package:mobile/shared/widgets/workspace_switcher.dart';

void main() {
  test(
    'UT-MOB-WORKSPACE-001 only SUPERADMIN and SUPERVISOR can switch workspaces',
    () {
      for (final role in UserRole.values) {
        expect(
          role.canSwitchWorkspace,
          role == UserRole.superadmin || role == UserRole.supervisor,
          reason: role.apiValue,
        );
      }
      expect(UserRole.kitchenStaff.canAccessPos, isFalse);
      expect(UserRole.kitchenHead.canAccessPos, isFalse);
      expect(UserRole.supervisor.canAccessKitchenBoard, isTrue);
      expect(UserRole.superadmin.canAccessKitchenBoard, isTrue);
      expect(UserRole.manager.canAccessKitchenBoard, isFalse);
    },
  );

  Future<GoRouter> pump(WidgetTester tester, UserRole role) async {
    final router = GoRouter(
      initialLocation: AppRoutes.menu,
      routes: [
        GoRoute(
          path: AppRoutes.menu,
          builder: (_, _) => const Scaffold(
            body: Column(children: [WorkspaceSwitcher(), Text('POS page')]),
          ),
        ),
        GoRoute(
          path: AppRoutes.kitchenTickets,
          builder: (_, _) => const Scaffold(
            body: Column(children: [WorkspaceSwitcher(), Text('KDS page')]),
          ),
        ),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [userRoleProvider.overrideWith(() => _FixedRole(role))],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
    return router;
  }

  testWidgets(
    'WT-MOB-WORKSPACE-001 SUPERADMIN can switch from POS to KDS and back',
    (tester) async {
      await pump(tester, UserRole.superadmin);
      expect(find.byKey(const ValueKey('workspace-switcher')), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('workspace-switcher')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('workspace-option-KDS')));
      await tester.pumpAndSettle();
      expect(find.text('KDS page'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('workspace-switcher')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('workspace-option-POS')));
      await tester.pumpAndSettle();
      expect(find.text('POS page'), findsOneWidget);
    },
  );

  testWidgets(
    'WT-MOB-WORKSPACE-002 switcher is hidden for roles that cannot switch',
    (tester) async {
      await pump(tester, UserRole.kitchenHead);
      expect(find.byKey(const ValueKey('workspace-switcher')), findsNothing);
    },
  );

  testWidgets(
    'WT-MOB-WORKSPACE-003 SUPERVISOR defaults to menu screen on login',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          sessionProvider.overrideWith((ref) => true),
          userRoleProvider.overrideWith(() => _FixedRole(UserRole.supervisor)),
          menuItemsProvider.overrideWith((ref) async => []),
          availabilityMenuItemsProvider.overrideWith((ref) async => []),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);
      router.go(AppRoutes.login);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();
      expect(router.routeInformationProvider.value.uri.path, AppRoutes.menu);
    },
  );

  testWidgets(
    'WT-MOB-WORKSPACE-004 KITCHEN_HEAD defaults to kitchenTickets on login',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          sessionProvider.overrideWith((ref) => true),
          userRoleProvider.overrideWith(() => _FixedRole(UserRole.kitchenHead)),
          menuItemsProvider.overrideWith((ref) async => []),
          availabilityMenuItemsProvider.overrideWith((ref) async => []),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(routerProvider);
      router.go(AppRoutes.login);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        router.routeInformationProvider.value.uri.path,
        AppRoutes.kitchenTickets,
      );
    },
  );

  testWidgets(
    'WT-MOB-WORKSPACE-005 AppHeaderRoleChip displays role text without dropdown icon',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: AppHeaderRoleChip(role: 'Supervisor')),
        ),
      );

      expect(find.text('Supervisor'), findsOneWidget);
      // Role pill must not have dropdown icon
      expect(
        find.descendant(
          of: find.byType(AppHeaderRoleChip),
          matching: find.byIcon(Icons.keyboard_arrow_down_rounded),
        ),
        findsNothing,
      );
    },
  );

  testWidgets(
    'WT-MOB-WORKSPACE-006 role pill text remains visible alongside compact switcher and logout in phone view',
    (tester) async {
      for (final phoneSize in [const Size(390, 844), const Size(360, 800)]) {
        tester.view.physicalSize = phoneSize;
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        final container = ProviderContainer(
          overrides: [
            userRoleProvider.overrideWith(() => _FixedRole(UserRole.superadmin)),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(
              home: Scaffold(
                appBar: AppHeader(title: 'Orders'),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Check no layout overflow occurred
        expect(tester.takeException(), isNull);

        // Verify WorkspaceSwitcher, LogoutButton, and AppHeaderRoleChip are present
        expect(find.byKey(const ValueKey('workspace-switcher')), findsOneWidget);
        expect(find.byType(LogoutButton), findsOneWidget);
        expect(find.byType(AppHeaderRoleChip), findsOneWidget);

        // Role pill text must exist, be visible, and have non-zero width
        final roleTextFinder = find.descendant(
          of: find.byType(AppHeaderRoleChip),
          matching: find.text('Superadmin'),
        );
        expect(roleTextFinder, findsOneWidget);

        final roleTextSize = tester.getSize(roleTextFinder);
        expect(roleTextSize.width, greaterThan(30.0),
            reason: 'Role pill text must not be crushed or hidden on $phoneSize');

        // WorkspaceSwitcher is compact
        final switcherSize = tester.getSize(find.byKey(const ValueKey('workspace-switcher')));
        expect(switcherSize.width, lessThan(90.0),
            reason: 'WorkspaceSwitcher should have compact footprint');

        // LogoutButton is compact
        final logoutSize = tester.getSize(find.byType(LogoutButton));
        expect(logoutSize.width, lessThanOrEqualTo(36.0),
            reason: 'LogoutButton should have compact footprint');
      }
    },
  );
}

class _FixedRole extends UserRoleNotifier {
  _FixedRole(this._role);
  final UserRole _role;

  @override
  UserRole? build() => _role;
}
