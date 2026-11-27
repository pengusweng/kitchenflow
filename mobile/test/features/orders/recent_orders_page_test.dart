import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_orders_master_pane.dart';
import 'package:mobile/features/orders/screens/orders_screen.dart';

void main() {
  group('Recent Orders Page Tests', () {
    testWidgets(
      'displays Paid, Unpaid, and Closed tabs and DOES NOT contain Voided tab',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 900);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
          ),
        );
        await tester.pumpAndSettle();

        // Back button beside tabs exists
        expect(
          find.byKey(const ValueKey('recent-orders-back-button')),
          findsOneWidget,
        );

        // Paid, Unpaid, and Closed tabs exist
        expect(find.byType(RecentOrdersMasterPane), findsOneWidget);
        expect(find.byKey(const Key('recent-orders-tab-paid')), findsOneWidget);
        expect(
          find.byKey(const Key('recent-orders-tab-unpaid')),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('recent-orders-tab-closed')),
          findsOneWidget,
        );
        expect(find.textContaining('Paid', findRichText: true), findsWidgets);
        expect(find.textContaining('Unpaid', findRichText: true), findsWidgets);
        expect(find.textContaining('Closed', findRichText: true), findsWidgets);

        // Explicit user requirement: "Remove the voided tab"
        expect(find.text('Voided'), findsNothing);
        expect(find.textContaining('Voided', findRichText: true), findsNothing);
      },
    );

    testWidgets(
      'displays split GrabFood and foodpanda channels and no Quick Serve',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 900);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
          ),
        );
        await tester.pumpAndSettle();

        // Check required channel filter chips
        expect(find.text('All'), findsOneWidget);
        expect(find.widgetWithText(FilterChip, 'Dine In'), findsOneWidget);
        expect(find.widgetWithText(FilterChip, 'Takeaway'), findsOneWidget);
        expect(find.widgetWithText(FilterChip, 'GrabFood'), findsOneWidget);
        expect(find.widgetWithText(FilterChip, 'foodpanda'), findsOneWidget);

        // Quick Serve should be removed
        expect(find.text('Quick Serve'), findsNothing);
      },
    );

    testWidgets(
      'detail pane does not show print/email icons or payment platform',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 900);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
          ),
        );
        await tester.pumpAndSettle();

        // Print and mail icons removed
        expect(find.byIcon(Icons.print_outlined), findsNothing);
        expect(find.byIcon(Icons.mail_outline_rounded), findsNothing);

        // Payment platform container removed
        expect(find.textContaining('Payment:'), findsNothing);

        // Financial totals still present
        expect(find.text('Subtotal:'), findsOneWidget);
        expect(find.text('Tax (VAT / 8.5%):'), findsOneWidget);
        expect(find.text('Total:'), findsOneWidget);
      },
    );

    testWidgets('allows switching between Unpaid, Paid, and Closed tabs', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
        ),
      );
      await tester.pumpAndSettle();

      // Initially Unpaid tab is active: unpaid orders appear
      expect(find.text('#1001-16330'), findsOneWidget);
      expect(find.text('#1001-16331'), findsOneWidget);
      expect(find.text('#1001-16332'), findsNothing);
      expect(find.text('#1001-16333'), findsNothing);

      // Tap on #1001-16330 to inspect its details
      await tester.tap(find.text('#1001-16330'));
      await tester.pumpAndSettle();

      // Details of unpaid order 1001-16330
      expect(find.text('Order 1001-16330'), findsOneWidget);
      expect(find.text('Spicy Glazed Wings (6pcs)'), findsOneWidget);
      expect(find.text('Cancel Order'), findsOneWidget);

      // Tap on Paid tab
      await tester.tap(find.byKey(const Key('recent-orders-tab-paid')));
      await tester.pumpAndSettle();

      // Paid orders should appear
      expect(find.text('#1001-16332'), findsOneWidget);
      expect(find.text('#1001-16333'), findsOneWidget);
      expect(find.text('#1001-16330'), findsNothing);

      // Tap on #1001-16332 to inspect its details
      await tester.tap(find.text('#1001-16332'));
      await tester.pumpAndSettle();

      // Details of paid order 1001-16332
      expect(find.text('Order 1001-16332'), findsOneWidget);
      expect(find.text('Cancel Order'), findsOneWidget);

      // Tap on Closed tab
      await tester.tap(find.byKey(const Key('recent-orders-tab-closed')));
      await tester.pumpAndSettle();

      // Closed orders should appear
      expect(find.text('#1001-16329'), findsOneWidget);
      expect(find.text('Cancel Order'), findsNothing);
    });

    testWidgets(
      'reopen order button is removed and cancel order is kept on open orders',
      (tester) async {
        tester.view.physicalSize = const Size(1200, 900);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
          ),
        );
        await tester.pumpAndSettle();

        // Initially unpaid order #1001-16330 is selected: Cancel Order exists, NO Reopen Order button
        expect(find.text('Cancel Order'), findsOneWidget);
        expect(find.text('Reopen Order'), findsNothing);

        // Switch to closed orders tab
        await tester.tap(find.byKey(const Key('recent-orders-tab-closed')));
        await tester.pumpAndSettle();

        // Closed orders have neither Reopen Order nor Cancel Order
        expect(find.text('Reopen Order'), findsNothing);
        expect(find.text('Cancel Order'), findsNothing);

        // Switch to paid orders tab
        await tester.tap(find.byKey(const Key('recent-orders-tab-paid')));
        await tester.pumpAndSettle();

        // Paid orders keep the Cancel Order button
        expect(find.text('Cancel Order'), findsOneWidget);
        expect(find.text('Reopen Order'), findsNothing);
      },
    );

    testWidgets('search filters orders dynamically', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(theme: counterTheme, home: const OrdersScreen()),
        ),
      );
      await tester.pumpAndSettle();

      // Default unpaid tab has #1001-16330 and #1001-16331
      expect(find.text('#1001-16330'), findsOneWidget);
      expect(find.text('#1001-16331'), findsOneWidget);

      // Enter search text "Glazed"
      await tester.enterText(find.byType(EditableText).first, 'Glazed');
      await tester.pumpAndSettle();

      // Only #1001-16330 has Glazed wings
      expect(find.text('#1001-16330'), findsOneWidget);
      expect(find.text('#1001-16331'), findsNothing);
    });
  });
}
