import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/pages/menu_screen.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_selector/current_menu_card.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

const _brandGc = AssignedBrand(
  id: 'gc-uuid',
  code: 'GC',
  name: 'Gamcheon',
);

const _brandKk = AssignedBrand(
  id: 'kk-uuid',
  code: 'KK',
  name: 'King Kungs Cafe',
);

const _sampleItem = MenuItem(
  id: 'sample-item-1',
  name: 'Samgyupsal Bowl',
  description: 'Grilled pork belly',
  pricesCentavos: {MenuChannel.dineIn: 25000},
);

Future<ProviderContainer> _pumpMenuScreen(
  WidgetTester tester, {
  bool withCartItem = false,
}) async {
  tester.view.physicalSize = const Size(1068, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final container = ProviderContainer(
    overrides: [
      assignedBrandsProvider.overrideWithValue([_brandGc, _brandKk]),
      menuItemsProvider.overrideWith((ref) async => [_sampleItem]),
    ],
  );
  addTearDown(container.dispose);

  container.read(activeBrandProvider.notifier).select(_brandGc);
  container.read(cartProvider.notifier).clear();

  if (withCartItem) {
    container.read(cartProvider.notifier).add(_sampleItem);
  }

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: counterTheme,
        home: const Scaffold(body: MenuScreen()),
      ),
    ),
  );
  await tester.pumpAndSettle();

  return container;
}

void main() {
  testWidgets(
    'Switching brand with empty cart switches immediately without confirmation',
    (tester) async {
      final container = await _pumpMenuScreen(tester, withCartItem: false);

      expect(container.read(activeBrandProvider).id, _brandGc.id);

      // Tap provider card to open brand selection modal
      await tester.tap(find.byType(CurrentMenuCard));
      await tester.pumpAndSettle();

      expect(find.text('Choose provider'), findsOneWidget);

      // Select King Kungs Cafe
      await tester.tap(find.text('King Kungs Cafe'));
      await tester.pumpAndSettle();

      // Tap Switch provider
      await tester.tap(find.byKey(const ValueKey('switch-menu-button')));
      await tester.pumpAndSettle();

      // Brand switch confirmation should NOT appear
      expect(find.text('Clear cart & switch'), findsNothing);
      expect(container.read(activeBrandProvider).id, _brandKk.id);
      expect(container.read(cartProvider), isEmpty);
    },
  );

  testWidgets(
    'Switching brand with populated cart shows confirmation; cancelling preserves cart and brand',
    (tester) async {
      final container = await _pumpMenuScreen(tester, withCartItem: true);

      expect(container.read(activeBrandProvider).id, _brandGc.id);
      expect(container.read(cartCountProvider), 1);

      // Tap provider card
      await tester.tap(find.byType(CurrentMenuCard));
      await tester.pumpAndSettle();

      // Select King Kungs Cafe
      await tester.tap(find.text('King Kungs Cafe'));
      await tester.pumpAndSettle();

      // Tap Switch provider
      await tester.tap(find.byKey(const ValueKey('switch-menu-button')));
      await tester.pumpAndSettle();

      // Confirmation dialog must appear
      expect(find.text('Switch to King Kungs Cafe?'), findsOneWidget);
      expect(find.text('Keep current order'), findsOneWidget);
      expect(find.text('Clear cart & switch'), findsOneWidget);

      // Tap Keep current order
      await tester.tap(find.text('Keep current order'));
      await tester.pumpAndSettle();

      // Brand and cart remain intact
      expect(container.read(activeBrandProvider).id, _brandGc.id);
      expect(container.read(cartCountProvider), 1);
      expect(container.read(cartProvider).single.brandName, _brandGc.name);
    },
  );

  testWidgets(
    'Switching brand with populated cart shows confirmation; confirming clears cart and switches brand',
    (tester) async {
      final container = await _pumpMenuScreen(tester, withCartItem: true);

      expect(container.read(activeBrandProvider).id, _brandGc.id);
      expect(container.read(cartCountProvider), 1);

      // Tap provider card
      await tester.tap(find.byType(CurrentMenuCard));
      await tester.pumpAndSettle();

      // Select King Kungs Cafe
      await tester.tap(find.text('King Kungs Cafe'));
      await tester.pumpAndSettle();

      // Tap Switch provider
      await tester.tap(find.byKey(const ValueKey('switch-menu-button')));
      await tester.pumpAndSettle();

      // Tap Clear cart & switch
      await tester.tap(find.text('Clear cart & switch'));
      await tester.pumpAndSettle();

      // Brand switched and cart cleared
      expect(container.read(activeBrandProvider).id, _brandKk.id);
      expect(container.read(cartCountProvider), 0);
      expect(container.read(cartProvider), isEmpty);
    },
  );
}
