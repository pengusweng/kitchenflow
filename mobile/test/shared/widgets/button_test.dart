import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/shared/widgets/button/button.dart';

void main() {
  Widget buildTestWidget(Widget child) {
    return MaterialApp(
      theme: counterTheme,
      home: Scaffold(body: Center(child: child)),
    );
  }

  group('KkfcPrimaryButton', () {
    testWidgets('WT-MOB-BUTTON-001 renders label and handles tap', (
      tester,
    ) async {
      var tapped = false;

      await tester.pumpWidget(
        buildTestWidget(
          KkfcPrimaryButton(label: 'Sign in', onPressed: () => tapped = true),
        ),
      );

      expect(find.text('Sign in'), findsOneWidget);
      await tester.tap(find.byType(KkfcPrimaryButton));
      expect(tapped, isTrue);
    });

    testWidgets(
      'WT-MOB-BUTTON-002 shows loading spinner and ignores tap when loading',
      (tester) async {
        var tapped = false;

        await tester.pumpWidget(
          buildTestWidget(
            KkfcPrimaryButton(
              label: 'Sign in',
              loadingLabel: 'Signing in…',
              isLoading: true,
              onPressed: () => tapped = true,
            ),
          ),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Signing in…'), findsOneWidget);

        await tester.tap(find.byType(KkfcPrimaryButton));
        expect(tapped, isFalse);
      },
    );

    testWidgets(
      'WT-MOB-BUTTON-003 renders leading and trailing icons and price',
      (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            const KkfcPrimaryButton(
              label: 'Add to order',
              leadingIcon: Icon(Icons.add),
              trailingText: '₱220.00',
              onPressed: null,
            ),
          ),
        );

        expect(find.byIcon(Icons.add), findsOneWidget);
        expect(find.text('Add to order'), findsOneWidget);
        expect(find.text('₱220.00'), findsOneWidget);
      },
    );
  });

  group('KkfcOutlinedButton', () {
    testWidgets(
      'WT-MOB-BUTTON-004 renders standard outlined button with label',
      (tester) async {
        var tapped = false;

        await tester.pumpWidget(
          buildTestWidget(
            KkfcOutlinedButton(
              label: 'Keep Dine-in',
              onPressed: () => tapped = true,
            ),
          ),
        );

        expect(find.text('Keep Dine-in'), findsOneWidget);
        await tester.tap(find.byType(KkfcOutlinedButton));
        expect(tapped, isTrue);
      },
    );

    testWidgets('WT-MOB-BUTTON-005 renders danger intent and badge', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestWidget(
          const KkfcOutlinedButton(
            label: 'Unavailable',
            intent: KkfcButtonIntent.danger,
            badge: Text('[1]'),
            onPressed: null,
          ),
        ),
      );

      expect(find.text('Unavailable'), findsOneWidget);
      expect(find.text('[1]'), findsOneWidget);
    });

    testWidgets(
      'WT-MOB-BUTTON-006 renders dashed border style without errors',
      (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            const KkfcOutlinedButton(
              label: 'Add ingredient',
              borderStyle: KkfcBorderStyle.dashed,
              leadingIcon: Icon(Icons.add),
              onPressed: null,
            ),
          ),
        );

        expect(find.text('Add ingredient'), findsOneWidget);
        expect(find.byIcon(Icons.add), findsOneWidget);
        expect(find.byType(CustomPaint), findsWidgets);
      },
    );
  });

  group('KkfcSubtleButton', () {
    testWidgets('WT-MOB-BUTTON-007 renders subtle button and fires callback', (
      tester,
    ) async {
      var tapped = false;

      await tester.pumpWidget(
        buildTestWidget(
          KkfcSubtleButton(
            label: 'Edit prices',
            leadingIcon: const Icon(Icons.edit),
            onPressed: () => tapped = true,
          ),
        ),
      );

      expect(find.text('Edit prices'), findsOneWidget);
      expect(find.byIcon(Icons.edit), findsOneWidget);

      await tester.tap(find.byType(KkfcSubtleButton));
      expect(tapped, isTrue);
    });
  });

  group('KkfcGhostButton', () {
    testWidgets(
      'WT-MOB-BUTTON-008 renders ghost button with underline and danger intent',
      (tester) async {
        var tapped = false;

        await tester.pumpWidget(
          buildTestWidget(
            KkfcGhostButton(
              label: 'Change',
              underline: true,
              onPressed: () => tapped = true,
            ),
          ),
        );

        expect(find.text('Change'), findsOneWidget);
        await tester.tap(find.byType(KkfcGhostButton));
        expect(tapped, isTrue);
      },
    );
  });

  group('KkfcSplitButton', () {
    testWidgets('WT-MOB-BUTTON-009 renders left and right content separated', (
      tester,
    ) async {
      await tester.pumpWidget(
        buildTestWidget(
          const KkfcSplitButton(
            label: '2 items',
            leadingIcon: Icon(Icons.shopping_cart),
            trailingValue: 'View order · ₱520.00',
            onPressed: null,
          ),
        ),
      );

      expect(find.byIcon(Icons.shopping_cart), findsOneWidget);
      expect(find.text('2 items'), findsOneWidget);
      expect(find.text('View order · ₱520.00'), findsOneWidget);
    });
  });

  group('KkfcIconButton', () {
    testWidgets(
      'WT-MOB-BUTTON-010 renders square icon button and shows tooltip',
      (tester) async {
        var tapped = false;

        await tester.pumpWidget(
          buildTestWidget(
            KkfcIconButton(
              icon: const Icon(Icons.close),
              tooltip: 'Close modal',
              onPressed: () => tapped = true,
            ),
          ),
        );

        expect(find.byIcon(Icons.close), findsOneWidget);
        expect(find.byType(Tooltip), findsOneWidget);

        await tester.tap(find.byType(KkfcIconButton));
        expect(tapped, isTrue);
      },
    );
  });

  group('KkfcButton factory dispatch', () {
    testWidgets(
      'WT-MOB-BUTTON-011 KkfcButton.primary builds KkfcPrimaryButton',
      (tester) async {
        await tester.pumpWidget(
          buildTestWidget(
            KkfcButton.primary(label: 'Continue', onPressed: () {}),
          ),
        );

        expect(find.byType(KkfcPrimaryButton), findsOneWidget);
      },
    );

    testWidgets(
      'WT-MOB-BUTTON-012 KkfcButton.outlined builds KkfcOutlinedButton',
      (tester) async {
        await tester.pumpWidget(
          buildTestWidget(KkfcButton.outlined(label: 'Back', onPressed: () {})),
        );

        expect(find.byType(KkfcOutlinedButton), findsOneWidget);
      },
    );
  });
}
