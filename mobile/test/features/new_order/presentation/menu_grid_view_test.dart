import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/pages/menu_screen.dart';
import 'package:mobile/features/new_order/presentation/widgets/item_customization_dialog.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_grid_card.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

const _sampleItems = [
  MenuItem(
    id: 'bowl-1',
    name: 'Gamcheon Samgyupsal Bowl',
    description: 'Crispy savory pork belly with steamed rice and kimchi.',
    category: 'Rice bowls',
    imageUrl: 'assets/images/gamcheon.png',
    pricesCentavos: {MenuChannel.dineIn: 22000},
  ),
  MenuItem(
    id: 'snack-1',
    name: 'Kimchi Pancake',
    description: 'Crispy scallion pancake with house chili dipping sauce.',
    category: 'Snacks',
    pricesCentavos: {MenuChannel.dineIn: 15000},
  ),
];

Future<ProviderContainer> _pumpMenu(
  WidgetTester tester, {
  Size size = const Size(412, 900),
  MenuViewMode initialMode = MenuViewMode.grid,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final container = ProviderContainer(
    overrides: [
      menuItemsProvider.overrideWith((ref) async => _sampleItems),
      menuViewModeProvider.overrideWith(() => _TestViewModeNotifier(initialMode)),
    ],
  );
  addTearDown(container.dispose);

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

class _TestViewModeNotifier extends MenuViewModeNotifier {
  _TestViewModeNotifier(this._initial);
  final MenuViewMode _initial;

  @override
  MenuViewMode build() => _initial;
}

void main() {
  group('Menu Screen Grid and List View Switching', () {
    testWidgets(
      'WT-MOB-GRID-001 Menu screen starts in Grid view by default and renders MenuItemGridCards',
      (tester) async {
        await _pumpMenu(tester);

        // Grid/List toggle exists
        expect(find.byKey(const ValueKey('menu-view-mode-grid')), findsOneWidget);
        expect(find.byKey(const ValueKey('menu-view-mode-list')), findsOneWidget);

        // Grid view cards are rendered with image, name, and price only
        expect(find.byType(MenuItemGridCard), findsWidgets);
        expect(find.byType(MenuItemCard), findsNothing);
        expect(find.text('Gamcheon Samgyupsal Bowl'), findsOneWidget);
        expect(find.text('Kimchi Pancake'), findsOneWidget);
        expect(find.text('₱220.00'), findsOneWidget);
        expect(find.text('₱150.00'), findsOneWidget);

        // Strictly contains image, name, and price only:
        // Description must NOT be displayed in grid card
        expect(find.text('Crispy savory pork belly with steamed rice and kimchi.'), findsNothing);
        expect(find.text('Crispy scallion pancake with house chili dipping sauce.'), findsNothing);

        // Add button must NOT be displayed in grid card
        expect(find.text('Add'), findsNothing);
      },
    );

    testWidgets(
      'WT-MOB-GRID-002 Tapping List toggle switches from Grid view to List view',
      (tester) async {
        await _pumpMenu(tester);

        // Switch to List view
        await tester.tap(find.byKey(const ValueKey('menu-view-mode-list')));
        await tester.pumpAndSettle();

        // List view cards are rendered with description and Add button
        expect(find.byType(MenuItemCard), findsWidgets);
        expect(find.byType(MenuItemGridCard), findsNothing);
        expect(find.text('Crispy savory pork belly with steamed rice and kimchi.'), findsOneWidget);
        expect(find.text('Add'), findsWidgets);
      },
    );

    testWidgets(
      'WT-MOB-GRID-003 Tapping Grid toggle switches back from List view to Grid view',
      (tester) async {
        await _pumpMenu(tester, initialMode: MenuViewMode.list);

        // Initially in List view
        expect(find.byType(MenuItemCard), findsWidgets);
        expect(find.byType(MenuItemGridCard), findsNothing);

        // Switch back to Grid view
        await tester.tap(find.byKey(const ValueKey('menu-view-mode-grid')));
        await tester.pumpAndSettle();

        // Grid view is restored
        expect(find.byType(MenuItemGridCard), findsWidgets);
        expect(find.byType(MenuItemCard), findsNothing);
        expect(find.text('Crispy savory pork belly with steamed rice and kimchi.'), findsNothing);
      },
    );

    testWidgets(
      'WT-MOB-GRID-004 Tapping a MenuItemGridCard in Grid view opens customization dialog',
      (tester) async {
        await _pumpMenu(tester, initialMode: MenuViewMode.grid);

        expect(find.byType(MenuItemGridCard), findsWidgets);

        // Tap on Gamcheon Samgyupsal Bowl grid card
        await tester.tap(find.text('Gamcheon Samgyupsal Bowl'));
        await tester.pumpAndSettle();

        // Customization modal opens
        expect(find.byType(ItemCustomizationDialog), findsOneWidget);
        expect(find.text('Gamcheon Samgyupsal Bowl'), findsWidgets);
      },
    );

    testWidgets(
      'WT-MOB-GRID-005 Grid view does not overflow on standard phone layout',
      (tester) async {
        await _pumpMenu(tester, size: const Size(390, 844), initialMode: MenuViewMode.grid);
        expect(tester.takeException(), isNull);
        expect(find.byType(MenuItemGridCard), findsWidgets);
      },
    );

    testWidgets(
      'WT-MOB-GRID-006 Grid view does not overflow on narrow phone layout',
      (tester) async {
        await _pumpMenu(tester, size: const Size(320, 640), initialMode: MenuViewMode.grid);
        expect(tester.takeException(), isNull);
        expect(find.byType(MenuItemGridCard), findsWidgets);
      },
    );

    testWidgets(
      'WT-MOB-GRID-007 Grid view renders cleanly on wide desktop screen',
      (tester) async {
        await _pumpMenu(tester, size: const Size(1280, 800), initialMode: MenuViewMode.grid);
        expect(tester.takeException(), isNull);
        expect(find.byType(MenuItemGridCard), findsWidgets);
      },
    );
  });
}
