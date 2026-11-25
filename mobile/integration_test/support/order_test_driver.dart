import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/app.dart';
import 'package:mobile/core/auth/token_store.dart';
import 'package:mobile/core/config/app_config.dart';
import 'package:mobile/features/auth/data/models/login_status.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/auth/presentation/widgets/login_notice.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/new_order/presentation/pages/menu_screen.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/cart_bar.dart';
import 'package:mobile/features/new_order/presentation/widgets/item_customization_dialog.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_grid_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/cart_panel/cart_panel.dart';
import 'package:mobile/features/new_order/presentation/widgets/order_flow/order_details_step_view.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/main.dart' as app;
import 'package:mobile/shared/widgets/kkfc_loading_button.dart';

const orderUsername = String.fromEnvironment('TEST_USERNAME');
const orderPassword = String.fromEnvironment('TEST_PASSWORD');
const orderBrandId = String.fromEnvironment('POS_BRAND_ID');
const orderItemId = String.fromEnvironment('POS_MENU_ITEM_ID');
const unavailableOrderItemId = String.fromEnvironment(
  'POS_UNAVAILABLE_ITEM_ID',
);

void requireOrderFixtures() {
  const fixture = {
    'API_URL': String.fromEnvironment('API_URL'),
    'TEST_USERNAME': orderUsername,
    'TEST_PASSWORD': orderPassword,
    'POS_BRAND_ID': orderBrandId,
    'POS_MENU_ITEM_ID': orderItemId,
    'POS_UNAVAILABLE_ITEM_ID': unavailableOrderItemId,
    'POS_MANAGER_USERNAME': String.fromEnvironment('POS_MANAGER_USERNAME'),
    'POS_MANAGER_PASSWORD': String.fromEnvironment('POS_MANAGER_PASSWORD'),
    'POS_KITCHEN_ID': String.fromEnvironment('POS_KITCHEN_ID'),
    'POS_KITCHEN_USERNAME': String.fromEnvironment('POS_KITCHEN_USERNAME'),
    'POS_KITCHEN_PASSWORD': String.fromEnvironment('POS_KITCHEN_PASSWORD'),
  };
  final missing = [
    if (AppConfig.env != 'test') 'ENV=test',
    for (final entry in fixture.entries)
      if (entry.value.trim().isEmpty) entry.key,
  ];
  if (missing.isNotEmpty) {
    throw StateError(
      'Missing or invalid order test config: ${missing.join(', ')}. Run mobile-pos-fixtures.ts prepare --orders and pass .fixtures/order-flow.json.',
    );
  }
}

Dio orderApi([String? token]) => Dio(
  BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 20),
    sendTimeout: const Duration(seconds: 20),
    headers: {if (token != null) 'Authorization': 'Bearer $token'},
    validateStatus: (_) => true,
  ),
);

Finder orderMenuItem(String id) => find.byWidgetPredicate(
  (w) =>
      (w is MenuItemCard && w.item.id == id) ||
      (w is MenuItemGridCard && w.item.id == id),
);

Future<void> addOrderMenuItem(WidgetTester tester, String itemId) async {
  await orderTap(tester, orderMenuItem(itemId));
  final dialog = find.byType(ItemCustomizationDialog);
  expect(dialog, findsOneWidget);
  await orderTap(
    tester,
    find.descendant(of: dialog, matching: find.text('Add to order')),
  );
  expect(dialog, findsNothing);
}

Future<void> waitForOrderUi(
  WidgetTester tester,
  bool Function() ready,
  String reason,
) async {
  final watch = Stopwatch()..start();
  while (!ready() && watch.elapsed < const Duration(seconds: 45)) {
    await tester.pump(const Duration(milliseconds: 100));
  }
  expect(ready(), isTrue, reason: 'Timed out waiting for $reason.');
  await tester.pumpAndSettle();
}

Future<void> orderTap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<ProviderContainer> loginForOrders(WidgetTester tester) async {
  final store = TokenStore();
  addTearDown(() async {
    final token = await store.read();
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.pumpWidget(const SizedBox.shrink());
    final api = orderApi(token);
    try {
      if (token != null) {
        expect((await api.post<void>('/auth/logout')).statusCode, 204);
      }
    } finally {
      api.close(force: true);
      await store.clear();
    }
  });
  await store.clear();
  await app.main();
  await tester.pumpAndSettle();
  expect(find.byType(LoginScreen), findsOneWidget);
  final username = find.byType(TextField).first;
  final password = find.byType(TextField).last;
  await tester.ensureVisible(username);
  await tester.enterText(username, orderUsername);
  await tester.ensureVisible(password);
  await tester.enterText(password, orderPassword);
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  await orderTap(tester, find.byType(KkfcLoadingButton));
  await waitForOrderUi(
    tester,
    () =>
        find.byType(MenuScreen).evaluate().isNotEmpty ||
        find
            .byType(LoginNotice)
            .evaluate()
            .any((e) => (e.widget as LoginNotice).status.hasNotice),
    'login',
  );
  expect(find.byType(MenuScreen), findsOneWidget);
  final container = ProviderScope.containerOf(tester.element(find.byType(App)));
  await selectFixtureBrand(tester, container, orderBrandId);
  await waitForOrderUi(
    tester,
    () => orderMenuItem(orderItemId).evaluate().isNotEmpty,
    'real API brand and menu',
  );
  expect(container.read(activeBrandProvider).id, orderBrandId);
  expect(container.read(cartProvider), isEmpty);
  return container;
}

/// Backend-only scenarios authenticate directly, without rendering unrelated UI.
Future<(Dio, String)> loginForOrderApi() async {
  final api = orderApi();
  String? token;
  addTearDown(() async {
    try {
      if (token != null) {
        expect((await api.post('/auth/logout')).statusCode, 204);
      }
    } finally {
      api.close(force: true);
    }
  });
  final response = await api.post<Map<String, dynamic>>(
    '/auth/login',
    data: {'username': orderUsername, 'password': orderPassword},
  );
  expect(response.statusCode, 200, reason: '${response.data}');
  token = response.data!['token'] as String;
  api.options.headers['Authorization'] = 'Bearer $token';
  final brand = await api.get<Map<String, dynamic>>('/brands/$orderBrandId');
  expect(brand.statusCode, 200, reason: '${brand.data}');
  expect(brand.data!['brand_id'], orderBrandId);
  return (api, (brand.data!['code'] as String).trim());
}

Dio authenticatedOrderApi(ProviderContainer container) {
  final api = orderApi(container.read(sessionTokenProvider));
  addTearDown(() => api.close(force: true));
  return api;
}

Future<void> openOrderCart(WidgetTester tester) async {
  if (find.byType(CartPanel).evaluate().isEmpty) {
    await orderTap(
      tester,
      find.descendant(of: find.byType(CartBar), matching: find.byType(InkWell)),
    );
  }
  expect(find.byType(CartPanel), findsOneWidget);
}

Future<void> selectFixtureBrand(
  WidgetTester tester,
  ProviderContainer container,
  String brandId,
) async {
  await waitForOrderUi(
    tester,
    () => container
        .read(assignedBrandsProvider)
        .any((brand) => brand.id == brandId),
    'fixture brand in the API catalog',
  );
  if (container.read(activeBrandProvider).id == brandId) return;
  await orderTap(
    tester,
    find.byKey(const ValueKey('current-menu-selector-card')),
  );
  await orderTap(tester, find.byKey(ValueKey('select-provider-$brandId')));
  await orderTap(tester, find.byKey(const ValueKey('switch-menu-button')));
  expect(container.read(activeBrandProvider).id, brandId);
}

Future<void> openOrderDetails(WidgetTester tester) async {
  await openOrderCart(tester);
  await orderTap(tester, find.text('Continue to order details'));
  expect(find.byType(OrderDetailsStepView), findsOneWidget);
}

Future<void> fillOrderReference(
  WidgetTester tester,
  String reference, {
  MenuChannel channel = MenuChannel.dineIn,
}) async {
  await openOrderDetails(tester);
  await orderTap(tester, find.byKey(ValueKey('channel-${channel.name}')));
  final field = find.descendant(
    of: find.byType(OrderDetailsStepView),
    matching: find.byType(TextField),
  );
  await tester.ensureVisible(field);
  await tester.enterText(field, reference);
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
}
