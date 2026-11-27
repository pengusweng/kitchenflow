import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/features/orders/data/models/recent_order.dart';
import 'package:mobile/features/orders/data/seed/sample_recent_orders.dart';
import 'package:mobile/features/orders/presentation/widgets/recent_orders_master_pane.dart';
import 'package:mobile/features/orders/providers/recent_orders_provider.dart';
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

        // Back button beside tabs exists
        expect(
          find.byKey(const ValueKey('recent-orders-back-button')),
          findsOneWidget,
        );

        // Open and Closed tabs exist
        expect(find.byType(RecentOrdersMasterPane), findsOneWidget);
        expect(find.byKey(const Key('recent-orders-tab-open')), findsOneWidget);
        expect(
          find.byKey(const Key('recent-orders-tab-closed')),
          findsOneWidget,
        );
        expect(find.textContaining('Open', findRichText: true), findsWidgets);
        expect(find.textContaining('Closed', findRichText: true), findsWidgets);

        // Explicit user requirement: "Remove the voided tab", no separate paid/unpaid tabs
        expect(find.text('Voided'), findsNothing);
        expect(find.textContaining('Voided', findRichText: true), findsNothing);
        expect(find.byKey(const Key('recent-orders-tab-paid')), findsNothing);
        expect(find.byKey(const Key('recent-orders-tab-unpaid')), findsNothing);
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
      'detail pane removes components not in backend API and keeps Total',
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

        // Non-backend components removed (Payment platform, Subtotal, Tax, Server, Last Modified, Amount Due)
        expect(find.textContaining('Payment:'), findsNothing);
        expect(find.text('Subtotal:'), findsNothing);
        expect(find.text('Tax (VAT / 8.5%):'), findsNothing);
        expect(find.textContaining('Server:'), findsNothing);
        expect(find.textContaining('Last Modified:'), findsNothing);
        expect(find.textContaining('Due'), findsNothing);

        // Backend Total is present
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

      // Initially Open tab is active: open orders appear
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

      // Tap on Closed tab
      await tester.tap(find.byKey(const Key('recent-orders-tab-closed')));
      await tester.pumpAndSettle();

      // Closed orders should appear
      expect(find.text('#1001-16329'), findsOneWidget);
      expect(find.text('Cancel Order'), findsNothing);
      expect(find.text('#1001-16330'), findsNothing);
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

        // Initially open order #1001-16330 is selected: Cancel Order exists, NO Reopen Order button
        expect(find.text('Cancel Order'), findsOneWidget);
        expect(find.text('Reopen Order'), findsNothing);

        // Switch to closed orders tab
        await tester.tap(find.byKey(const Key('recent-orders-tab-closed')));
        await tester.pumpAndSettle();

        // Closed orders have neither Reopen Order nor Cancel Order
        expect(find.text('Reopen Order'), findsNothing);
        expect(find.text('Cancel Order'), findsNothing);

        // Switch back to open orders tab
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

    testWidgets('excludes DRAFT orders from state, display, and counts', (
      tester,
    ) async {
      final draftOrder = RecentOrder(
        id: 'ord-draft-001',
        orderCode: 'GC-DRAFT-001',
        ticketNumber: '#DRAFT-001',
        channel: 'Dine In',
        tableOrPickup: 'Table 9',
        tab: RecentOrderTab.open,
        orderStatus: 'DRAFT',
        statusLabel: 'Draft',
        totalCentavos: 1000,
        createdAt: DateTime.now(),
        items: const [],
      );

      final state = RecentOrdersState(
        orders: [draftOrder, ...createSampleRecentOrders()],
      );

      // Draft orders are never stored in state.orders or returned in filteredOrders
      expect(state.orders.any((o) => o.isDraft), isFalse);
      expect(state.filteredOrders.any((o) => o.isDraft), isFalse);
      expect(state.countForTab(RecentOrderTab.open), 4);
      expect(state.selectedOrder?.isDraft, isNot(true));
    });
  });
}
