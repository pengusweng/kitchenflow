import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/cart_panel/cart_panel.dart';
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

const _itemBulgogi = MenuItem(
  id: 'bulgogi',
  name: 'Gamcheon Bulgogi Bowl',
  description: '',
  pricesCentavos: {MenuChannel.dineIn: 25000},
);

const _itemLatte = MenuItem(
  id: 'latte',
  name: 'Matcha Latte',
  description: '',
  pricesCentavos: {MenuChannel.dineIn: 15000},
);

void main() {
  testWidgets('CartPanel splits and arranges items by brand into distinct sections', (
    tester,
  ) async {
    final container = ProviderContainer(
      overrides: [
        assignedBrandsProvider.overrideWithValue([_brandGc, _brandKk]),
      ],
    );
    addTearDown(container.dispose);

    // Add 1 item for Gamcheon, then 1 for King Kungs Cafe, then another for Gamcheon
    container.read(activeBrandProvider.notifier).select(_brandGc);
    container.read(cartProvider.notifier).add(_itemBulgogi);

    container.read(activeBrandProvider.notifier).select(_brandKk);
    container.read(cartProvider.notifier).add(_itemLatte);

    container.read(activeBrandProvider.notifier).select(_brandGc);
    container.read(cartProvider.notifier).add(_itemBulgogi);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: counterTheme,
          home: const Scaffold(
            body: SizedBox(
              width: 380,
              height: 800,
              child: CartPanel(),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Brand Group 1: Gamcheon
    final gcGroupFinder = find.byKey(const ValueKey('cart-brand-group-gc-uuid'));
    expect(gcGroupFinder, findsOneWidget);
    expect(
      find.descendant(of: gcGroupFinder, matching: find.text('Gamcheon')),
      findsOneWidget,
    );
    // Gamcheon has 2 items of Bulgogi Bowl (25000 * 2 = 50000 = ₱500.00)
    expect(
      find.descendant(of: gcGroupFinder, matching: find.text('2 items')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: gcGroupFinder, matching: find.text('₱500.00')),
      findsWidgets, // Brand subtotal and line total
    );
    expect(
      find.descendant(of: gcGroupFinder, matching: find.text('Gamcheon Bulgogi Bowl')),
      findsOneWidget,
    );

    // Verify Brand Group 2: King Kungs Cafe
    final kkGroupFinder = find.byKey(const ValueKey('cart-brand-group-kk-uuid'));
    expect(kkGroupFinder, findsOneWidget);
    expect(
      find.descendant(of: kkGroupFinder, matching: find.text('King Kungs Cafe')),
      findsOneWidget,
    );
    // King Kungs Cafe has 1 item of Matcha Latte (15000 = ₱150.00)
    expect(
      find.descendant(of: kkGroupFinder, matching: find.text('1 item')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: kkGroupFinder, matching: find.text('Matcha Latte')),
      findsOneWidget,
    );

    // Verify Cart Overall Total: ₱500.00 + ₱150.00 = ₱650.00
    expect(find.text('₱650.00'), findsWidgets);

    // Test Stepper Interaction: Increment Matcha Latte inside King Kungs Cafe section
    final addButtons = find.byIcon(Icons.add);
    expect(addButtons, findsNWidgets(2)); // One in each item tile
    await tester.tap(addButtons.last);
    await tester.pumpAndSettle();

    expect(container.read(cartCountProvider), 4);
    // King Kungs group now has 2 items and ₱300.00 subtotal
    expect(
      find.descendant(of: kkGroupFinder, matching: find.text('2 items')),
      findsOneWidget,
    );
    expect(find.text('₱800.00'), findsWidgets); // Overall total updated to ₱800.00

    // Test Clear cart
    final clearBtn = find.text('Clear');
    expect(clearBtn, findsOneWidget);
    await tester.tap(clearBtn);
    await tester.pumpAndSettle();

    expect(container.read(cartProvider), isEmpty);
    expect(find.byKey(const ValueKey('empty-cart')), findsOneWidget);
  });
}
