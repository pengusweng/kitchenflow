import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/pages/menu_screen.dart';
import 'package:mobile/features/new_order/presentation/widgets/catalog/catalog_pagination_bar.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_grid_card.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

List<MenuItem> _buildItems(int count) {
  return List<MenuItem>.generate(
    count,
    (index) => MenuItem(
      id: 'item-${index + 1}',
      name: 'Menu Item ${index + 1}',
      description: 'Test menu item #${index + 1}',
      category: index.isEven ? 'Bowls' : 'Sets',
      pricesCentavos: const {MenuChannel.dineIn: 15000},
      availability: {
        MenuChannel.dineIn: index < 20
            ? MenuAvailability.available
            : MenuAvailability.stockout,
      },
    ),
  );
}

Future<ProviderContainer> _pumpMenuWithItems(
  WidgetTester tester, {
  required List<MenuItem> items,
  Size size = const Size(1280, 1400),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final container = ProviderContainer(
    overrides: [menuItemsProvider.overrideWith((ref) async => items)],
  );
  addTearDown(container.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp(theme: counterTheme, home: const MenuScreen()),
    ),
  );
  await tester.pumpAndSettle();
  return container;
}

void main() {
  group('MenuScreen Pagination (16 items per page)', () {
    testWidgets(
      'WT-MOB-PAGE-001 Limits page 1 to 16 items and shows 1-16 of 25 range',
      (tester) async {
        final items = _buildItems(25);
        await _pumpMenuWithItems(tester, items: items);

        expect(kMenuItemsPerPage, 16);
        expect(find.byType(CatalogPaginationBar), findsOneWidget);
        expect(find.text('1–16 of 25'), findsOneWidget);

        // First 16 items present, item 17 not present on page 1
        expect(find.byType(MenuItemGridCard), findsNWidgets(16));
        expect(find.text('Menu Item 1'), findsOneWidget);
        expect(find.text('Menu Item 16'), findsOneWidget);
        expect(find.text('Menu Item 17'), findsNothing);
      },
    );

    testWidgets(
      'WT-MOB-PAGE-002 Navigating to page 2 shows items 17-25 and back to page 1',
      (tester) async {
        final items = _buildItems(25);
        final container = await _pumpMenuWithItems(tester, items: items);

        expect(container.read(menuPageProvider), 1);

        // Tap Next page button
        await tester.tap(find.byKey(const ValueKey('menu-pagination-next')));
        await tester.pumpAndSettle();

        expect(container.read(menuPageProvider), 2);
        expect(find.text('17–25 of 25'), findsOneWidget);
        expect(find.byType(MenuItemGridCard), findsNWidgets(9));
        expect(find.text('Menu Item 16'), findsNothing);
        expect(find.text('Menu Item 17'), findsOneWidget);
        expect(find.text('Menu Item 25'), findsOneWidget);

        // Tap Previous page button
        await tester.tap(find.byKey(const ValueKey('menu-pagination-prev')));
        await tester.pumpAndSettle();

        expect(container.read(menuPageProvider), 1);
        expect(find.text('1–16 of 25'), findsOneWidget);
        expect(find.byType(MenuItemGridCard), findsNWidgets(16));
        expect(find.text('Menu Item 1'), findsOneWidget);
      },
    );

    testWidgets(
      'WT-MOB-PAGE-003 Tapping page number button jumps directly to that page and resets on search/filter',
      (tester) async {
        final items = _buildItems(25);
        final container = await _pumpMenuWithItems(tester, items: items);

        // Tap Page 2 directly
        await tester.tap(find.byKey(const ValueKey('menu-pagination-page-2')));
        await tester.pumpAndSettle();
        expect(container.read(menuPageProvider), 2);

        // Toggling availability filter resets current page back to 1
        await tester.tap(
          find.byKey(const ValueKey('unavailable-filter-button')),
        );
        await tester.pumpAndSettle();

        expect(container.read(menuPageProvider), 1);
        expect(find.text('1–16 of 20'), findsOneWidget);
      },
    );

    testWidgets(
      'WT-MOB-PAGE-004 Pagination limit of 16 applies in List view as well as Grid view',
      (tester) async {
        final items = _buildItems(25);
        await _pumpMenuWithItems(
          tester,
          items: items,
          size: const Size(1280, 1600),
        );

        // Switch to List view
        await tester.tap(find.byKey(const ValueKey('menu-view-mode-list')));
        await tester.pumpAndSettle();

        expect(find.byType(MenuItemCard), findsNWidgets(16));
      },
    );

    testWidgets(
      'WT-MOB-PAGE-005 Pagination bar does not overflow on narrow 320px screens',
      (tester) async {
        final items = _buildItems(65); // 5 pages
        await _pumpMenuWithItems(
          tester,
          items: items,
          size: const Size(320, 1600),
        );
        expect(tester.takeException(), isNull);
        expect(find.byType(CatalogPaginationBar), findsOneWidget);
      },
    );
  });
}
