import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/cart_panel/cart_panel.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

const _brand = AssignedBrand(
  id: 'gc-uuid',
  code: 'GC',
  name: 'Gamcheon',
);

const _sampleItem = MenuItem(
  id: 'gamcheon-samgyupsal',
  name: 'Gamcheon Samgyupsal Rice Bowl',
  description: 'Pork belly with gochujang sweet soy sauce.',
  pricesCentavos: {MenuChannel.dineIn: 22000},
);

void main() {
  testWidgets(
    'WT-MOB-CART-ANIM-001 CartPanel animates transition from empty state into populated state',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          assignedBrandsProvider.overrideWithValue([_brand]),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: counterTheme,
            home: const Scaffold(
              body: SizedBox(width: 380, height: 800, child: CartPanel()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Initially empty
      expect(find.byKey(const ValueKey('empty-cart')), findsOneWidget);
      expect(find.byKey(const ValueKey('populated-cart')), findsNothing);
      expect(find.byKey(const ValueKey('cart-clear-btn')), findsNothing);

      // Add item to cart
      container.read(activeBrandProvider.notifier).select(_brand);
      container.read(cartProvider.notifier).add(_sampleItem);

      // Trigger frame: animation starts
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Both AnimatedSwitcher children are present during crossfade
      expect(find.byType(SlideTransition), findsWidgets);
      expect(find.byType(FadeTransition), findsWidgets);

      // Settle animation
      await tester.pumpAndSettle();

      // Populated cart fully visible, empty cart removed
      expect(find.byKey(const ValueKey('populated-cart')), findsOneWidget);
      expect(find.byKey(const ValueKey('empty-cart')), findsNothing);
      expect(find.byKey(const ValueKey('cart-clear-btn')), findsOneWidget);
      expect(find.text('Gamcheon Samgyupsal Rice Bowl'), findsOneWidget);
      expect(find.text('Continue to order details'), findsOneWidget);
    },
  );

  testWidgets(
    'WT-MOB-CART-ANIM-002 CartPanel animates transition from populated state back to empty state on clear',
    (tester) async {
      final container = ProviderContainer(
        overrides: [
          assignedBrandsProvider.overrideWithValue([_brand]),
        ],
      );
      addTearDown(container.dispose);

      // Start populated
      container.read(activeBrandProvider.notifier).select(_brand);
      container.read(cartProvider.notifier).add(_sampleItem);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: counterTheme,
            home: const Scaffold(
              body: SizedBox(width: 380, height: 800, child: CartPanel()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('populated-cart')), findsOneWidget);
      expect(find.byKey(const ValueKey('cart-clear-btn')), findsOneWidget);

      // Tap Clear
      await tester.tap(find.byKey(const ValueKey('cart-clear-btn')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // In flight transition
      expect(find.byType(SlideTransition), findsWidgets);

      // Finish transition
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('empty-cart')), findsOneWidget);
      expect(find.byKey(const ValueKey('populated-cart')), findsNothing);
      expect(find.byKey(const ValueKey('cart-clear-btn')), findsNothing);
      expect(find.text('No items yet. Choose an item from the\nmenu.'), findsOneWidget);
    },
  );
}
