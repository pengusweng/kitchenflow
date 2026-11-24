import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mobile/app/app.dart';
import 'package:mobile/core/auth/token_store.dart';
import 'package:mobile/core/config/app_config.dart';
import 'package:mobile/features/auth/presentation/pages/login_screen.dart';
import 'package:mobile/features/auth/data/models/login_status.dart';
import 'package:mobile/features/auth/presentation/widgets/login_notice.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/pages/menu_screen.dart';
import 'package:mobile/features/new_order/presentation/widgets/cart_panel/cart_panel.dart';
import 'package:mobile/features/new_order/presentation/widgets/catalog/catalog_search_bar.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_card.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/main.dart' as app;
import 'package:mobile/shared/widgets/kkfc_loading_button.dart';

import 'support/order_test_driver.dart'
    show addOrderMenuItem, openOrderCart, openOrderDetails, selectFixtureBrand;

const _username = String.fromEnvironment('TEST_USERNAME');
const _password = String.fromEnvironment('TEST_PASSWORD');
const _brandId = String.fromEnvironment('POS_BRAND_ID');
const _itemId = String.fromEnvironment('POS_MENU_ITEM_ID');
const _unavailableId = String.fromEnvironment('POS_UNAVAILABLE_ITEM_ID');

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() {
    if (AppConfig.env != 'test' || !const bool.hasEnvironment('API_URL')) {
      throw StateError('Use ENV=test and an explicit test API_URL.');
    }
    if ([
      _username,
      _password,
      _brandId,
      _itemId,
      _unavailableId,
    ].any((v) => v.isEmpty)) {
      throw StateError(
        'Prepare server/prisma/mobile-pos-fixtures.ts and use mobile/.fixtures/pos-flow.json.',
      );
    }
  });

  testWidgets(
    'IT-MOB-POS-001 Select the fixture brand and build, edit, and clear a Dine-in cart',
    (tester) async {
      final container = await _login(tester);
      final card = _item(_itemId);
      expect(
        find.descendant(of: card, matching: find.text(formatPeso(10000))),
        findsOneWidget,
      );
      await addOrderMenuItem(tester, _itemId);
      await addOrderMenuItem(tester, _itemId);
      expect(container.read(cartProvider), hasLength(1));
      _expectCart(container, quantity: 2, total: 20000);
      await openOrderCart(tester);
      _expectCartUi(container, quantity: 2, total: 20000);

      final cart = find.byType(CartPanel);
      await _tap(
        tester,
        find.descendant(of: cart, matching: find.byIcon(Icons.add)),
      );
      _expectCart(container, quantity: 3, total: 30000);
      _expectCartUi(container, quantity: 3, total: 30000);
      await _tap(
        tester,
        find.descendant(of: cart, matching: find.byIcon(Icons.remove)),
      );
      _expectCart(container, quantity: 2, total: 20000);
      _expectCartUi(container, quantity: 2, total: 20000);
      await _tap(
        tester,
        find.descendant(
          of: find.byType(CartPanel),
          matching: find.text('Clear'),
        ),
      );
      expect(container.read(cartProvider), isEmpty);
      expect(find.byKey(const ValueKey('empty-cart')), findsOneWidget);
    },
  );

  testWidgets(
    'IT-MOB-POS-002 Changing channel reprices the existing cart without losing quantities',
    (tester) async {
      final container = await _login(tester);
      await addOrderMenuItem(tester, _itemId);
      await addOrderMenuItem(tester, _itemId);
      _expectCart(container, quantity: 2, total: 20000);
      final lineId = container.read(cartProvider).single.id;
      await openOrderDetails(tester);
      await _tap(tester, find.byKey(const ValueKey('channel-takeaway')));
      _expectCart(container, quantity: 2, total: 25000);
      expect(container.read(cartProvider).single.id, lineId);
      expect(find.text(formatPeso(25000)), findsWidgets);
      expect(container.read(menuChannelProvider), MenuChannel.takeaway);
    },
  );

  testWidgets(
    'IT-MOB-POS-003 Unavailable items stay out of the cart and search finds an available meal',
    (tester) async {
      final container = await _login(tester);
      final unavailable = _item(_unavailableId);
      expect(
        tester
            .widget<MenuItemCard>(unavailable)
            .item
            .availabilityFor(MenuChannel.dineIn),
        isNot(MenuAvailability.available),
      );
      await _tap(tester, unavailable);
      _expectCart(container, quantity: 0, total: 0);
      final search = find.descendant(
        of: find.byType(CatalogSearchBar),
        matching: find.byType(TextField),
      );
      await tester.enterText(search, 'POS flow meal');
      FocusManager.instance.primaryFocus?.unfocus();
      await _wait(
        tester,
        () => container.read(menuSearchProvider) == 'POS flow meal',
        'debounced menu search',
      );
      expect(_item(_unavailableId), findsNothing);
      expect(_item(_itemId), findsOneWidget);
      await addOrderMenuItem(tester, _itemId);
      _expectCart(container, quantity: 1, total: 10000);
      await openOrderCart(tester);
      _expectCartUi(container, quantity: 1, total: 10000);
    },
  );
}

Finder _item(String id) => find.byWidgetPredicate(
  (widget) => widget is MenuItemCard && widget.item.id == id,
);

Future<ProviderContainer> _login(WidgetTester tester) async {
  final store = TokenStore();
  addTearDown(() async {
    final token = await store.read();
    await tester.pumpWidget(const SizedBox.shrink());
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 20),
      ),
    );
    try {
      if (token != null) {
        final response = await dio.post<void>(
          '/auth/logout',
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );
        expect(response.statusCode, 204);
      }
    } finally {
      dio.close(force: true);
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
  await tester.enterText(username, _username);
  await tester.ensureVisible(password);
  await tester.enterText(password, _password);
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  await _tap(tester, find.byType(KkfcLoadingButton), settle: false);
  await _wait(
    tester,
    () =>
        find.byType(MenuScreen).evaluate().isNotEmpty ||
        find
            .byType(LoginNotice)
            .evaluate()
            .any((e) => (e.widget as LoginNotice).status.hasNotice),
    'login response',
  );
  expect(find.byType(MenuScreen), findsOneWidget);
  final container = ProviderScope.containerOf(tester.element(find.byType(App)));
  expect(container.read(sessionTokenProvider), isNotNull);
  await selectFixtureBrand(tester, container, _brandId);
  await _wait(
    tester,
    () => _item(_itemId).evaluate().isNotEmpty,
    'fixture menu from the real API',
  );
  expect(container.read(activeBrandProvider).id, _brandId);
  expect(container.read(menuChannelProvider), MenuChannel.dineIn);
  expect(container.read(cartProvider), isEmpty);
  return container;
}

void _expectCart(
  ProviderContainer container, {
  required int quantity,
  required int total,
}) {
  expect(container.read(cartCountProvider), quantity);
  expect(container.read(cartTotalProvider), total);
  if (quantity > 0) {
    expect(container.read(cartProvider).single.item.id, _itemId);
    expect(container.read(cartProvider).single.quantity, quantity);
  }
}

void _expectCartUi(
  ProviderContainer container, {
  required int quantity,
  required int total,
}) {
  final line = container.read(cartProvider).single;
  expect(find.byKey(ValueKey('qty-${line.id}-$quantity')), findsOneWidget);
  expect(
    find.descendant(
      of: find.byType(CartPanel),
      matching: find.byKey(ValueKey('cart-total-$total')),
    ),
    findsOneWidget,
  );
}

Future<void> _tap(
  WidgetTester tester,
  Finder finder, {
  bool settle = true,
}) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

Future<void> _wait(
  WidgetTester tester,
  bool Function() ready,
  String description,
) async {
  final clock = Stopwatch()..start();
  while (!ready() && clock.elapsed < const Duration(seconds: 45)) {
    await tester.pump(const Duration(milliseconds: 100));
  }
  expect(ready(), isTrue, reason: 'Timed out waiting for $description.');
  await tester.pumpAndSettle();
}
