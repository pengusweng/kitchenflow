import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_orders_master_pane.dart';
import 'package:mobile/features/orders/screens/orders_screen.dart';

void main() {
  group('Recent Orders Page Tests', () {
    testWidgets(
      'displays Open and Closed tabs and DOES NOT contain Voided tab',
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

        // Open and Closed tabs exist
        expect(find.byType(RecentOrdersMasterPane), findsOneWidget);
        expect(find.byKey(const Key('recent-orders-tab-open')), findsOneWidget);
        expect(
          find.byKey(const Key('recent-orders-tab-closed')),
          findsOneWidget,
        );
        expect(find.textContaining('Open', findRichText: true), findsWidgets);
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
        expect(find.text('Dine In'), findsWidgets); // chip + card
        expect(find.text('Takeaway'), findsWidgets); // chip + card
        expect(find.text('GrabFood'), findsWidgets); // chip + card
        expect(find.text('foodpanda'), findsWidgets); // chip + card

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

    testWidgets('allows switching between Open and Closed tabs', (
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

      // Tap on Open tab
      await tester.tap(find.byKey(const Key('recent-orders-tab-open')));
      await tester.pumpAndSettle();

      // Open orders should now appear
      expect(find.text('#1001-16330'), findsOneWidget);
      expect(find.text('#1001-16331'), findsOneWidget);
      expect(find.text('#1001-16332'), findsOneWidget);
      expect(find.text('#1001-16333'), findsOneWidget);

      // Tap on #1001-16330 to inspect its details
      await tester.tap(find.text('#1001-16330'));
      await tester.pumpAndSettle();

      // Details of open order 1001-16330
      expect(find.text('Order 1001-16330'), findsOneWidget);
      expect(find.text('Spicy Glazed Wings (6pcs)'), findsOneWidget);
      expect(find.text('Cancel Order'), findsOneWidget);
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

        // Initially closed order #1001-16329 is selected: NO Reopen Order button
        expect(find.text('Reopen Order'), findsNothing);

        // Switch to open orders tab
        await tester.tap(find.byKey(const Key('recent-orders-tab-open')));
        await tester.pumpAndSettle();

        // Open orders keep the Cancel Order button
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

      expect(find.text('#1001-16329'), findsOneWidget);
      expect(find.text('#1001-16326'), findsOneWidget);

      // Enter search text "Linguini"
      await tester.enterText(find.byType(EditableText).first, 'Linguini');
      await tester.pumpAndSettle();

      // Only #1001-16329 has Linguini
      expect(find.text('#1001-16329'), findsOneWidget);
      expect(find.text('#1001-16326'), findsNothing);
    });
  });
}
