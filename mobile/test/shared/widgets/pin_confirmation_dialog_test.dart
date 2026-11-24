import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/models/user_role.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/shared/widgets/button/button.dart';
import 'package:mobile/shared/widgets/pin_confirmation/pin_confirmation.dart';

const _phone = Size(412, 900);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('showSuperadminPinConfirmationDialog role guard', () {
    testWidgets(
      'WT-MOB-PIN-CONFIRM-001 does NOT show dialog and returns false when role is NOT superadmin',
      (tester) async {
        tester.view.physicalSize = _phone;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            theme: counterTheme,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () async {
                    result = await showSuperadminPinConfirmationDialog(
                      context,
                      userRole: UserRole.cashierStaff,
                      expectedPin: '1234',
                    );
                  },
                  child: const Text('Trigger Action'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger Action'));
        await tester.pumpAndSettle();

        // Dialog should not have appeared
        expect(find.byType(PinConfirmationDialog), findsNothing);
        expect(result, isFalse);
      },
    );

    testWidgets(
      'WT-MOB-PIN-CONFIRM-002 shows dialog when user role IS superadmin',
      (tester) async {
        tester.view.physicalSize = _phone;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(
          MaterialApp(
            theme: counterTheme,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => showSuperadminPinConfirmationDialog(
                    context,
                    userRole: UserRole.superadmin,
                    expectedPin: '1234',
                  ),
                  child: const Text('Trigger Action'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Trigger Action'));
        await tester.pumpAndSettle();

        expect(find.byType(PinConfirmationDialog), findsOneWidget);
        expect(find.text('Superadmin Authorization'), findsOneWidget);
        expect(find.text('SUPERADMIN PRIVILEGE'), findsOneWidget);
      },
    );
  });

  group('requireSuperadminPinConfirmation with Riverpod', () {
    testWidgets(
      'WT-MOB-PIN-CONFIRM-003 denies action when userRoleProvider is supervisor or kitchen',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            initialRoleProvider.overrideWithValue(UserRole.supervisor),
          ],
        );
        addTearDown(container.dispose);

        bool? result;

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              theme: counterTheme,
              home: Consumer(
                builder: (context, ref, _) => Scaffold(
                  body: ElevatedButton(
                    onPressed: () async {
                      result = await requireSuperadminPinConfirmation(
                        context,
                        ref: ref,
                        expectedPin: '9999',
                      );
                    },
                    child: const Text('Authorize Override'),
                  ),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Authorize Override'));
        await tester.pumpAndSettle();

        expect(find.byType(PinConfirmationDialog), findsNothing);
        expect(result, isFalse);
      },
    );

    testWidgets(
      'WT-MOB-PIN-CONFIRM-004 opens dialog when userRoleProvider is superadmin',
      (tester) async {
        final container = ProviderContainer(
          overrides: [
            initialRoleProvider.overrideWithValue(UserRole.superadmin),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(
              theme: counterTheme,
              home: Consumer(
                builder: (context, ref, _) => Scaffold(
                  body: ElevatedButton(
                    onPressed: () => requireSuperadminPinConfirmation(
                      context,
                      ref: ref,
                      expectedPin: '9999',
                    ),
                    child: const Text('Authorize Override'),
                  ),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Authorize Override'));
        await tester.pumpAndSettle();

        expect(find.byType(PinConfirmationDialog), findsOneWidget);
      },
    );
  });

  group('PinConfirmationDialog UI & Interactivity', () {
    testWidgets(
      'WT-MOB-PIN-CONFIRM-005 numpad entry, backspace, clear, and successful validation',
      (tester) async {
        tester.view.physicalSize = _phone;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            theme: counterTheme,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () async {
                    result = await showSuperadminPinConfirmationDialog(
                      context,
                      userRole: UserRole.superadmin,
                      expectedPin: '1234',
                    );
                  },
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        expect(find.byType(PinConfirmationDots), findsOneWidget);

        // Tap digits '1', '2', '5'
        await tester.tap(find.text('1'));
        await tester.pump();
        await tester.tap(find.text('2'));
        await tester.pump();
        await tester.tap(find.text('5'));
        await tester.pump();

        // Tap backspace to delete '5'
        await tester.tap(find.byIcon(Icons.backspace_outlined));
        await tester.pump();

        // Tap clear to reset
        await tester.tap(find.text('C'));
        await tester.pump();

        // Now enter the correct PIN '1', '2', '3', '4'
        await tester.tap(find.text('1'));
        await tester.pump();
        await tester.tap(find.text('2'));
        await tester.pump();
        await tester.tap(find.text('3'));
        await tester.pump();
        await tester.tap(find.text('4'));
        await tester.pumpAndSettle();

        // Dialog should auto-submit and pop with true
        expect(find.byType(PinConfirmationDialog), findsNothing);
        expect(result, isTrue);
      },
    );

    testWidgets(
      'WT-MOB-PIN-CONFIRM-006 incorrect PIN displays error notice and shakes without popping',
      (tester) async {
        tester.view.physicalSize = _phone;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(
          MaterialApp(
            theme: counterTheme,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () => showSuperadminPinConfirmationDialog(
                    context,
                    userRole: UserRole.superadmin,
                    expectedPin: '8888',
                  ),
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        // Enter wrong PIN '1', '2', '3', '4'
        await tester.tap(find.text('1'));
        await tester.pump();
        await tester.tap(find.text('2'));
        await tester.pump();
        await tester.tap(find.text('3'));
        await tester.pump();
        await tester.tap(find.text('4'));
        await tester.pumpAndSettle();

        // Dialog stays open, displays error message
        expect(find.byType(PinConfirmationDialog), findsOneWidget);
        expect(find.text('Incorrect PIN. Please try again.'), findsOneWidget);
      },
    );

    testWidgets(
      'WT-MOB-PIN-CONFIRM-007 tapping Cancel dismisses dialog with false',
      (tester) async {
        tester.view.physicalSize = _phone;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            theme: counterTheme,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () async {
                    result = await showSuperadminPinConfirmationDialog(
                      context,
                      userRole: UserRole.superadmin,
                      expectedPin: '1234',
                    );
                  },
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        await tester.tap(find.widgetWithText(KkfcOutlinedButton, 'Cancel'));
        await tester.pumpAndSettle();

        expect(find.byType(PinConfirmationDialog), findsNothing);
        expect(result, isFalse);
      },
    );

    testWidgets(
      'WT-MOB-PIN-CONFIRM-008 hardware keyboard entries work seamlessly',
      (tester) async {
        tester.view.physicalSize = _phone;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.reset);

        bool? result;

        await tester.pumpWidget(
          MaterialApp(
            theme: counterTheme,
            home: Builder(
              builder: (context) => Scaffold(
                body: ElevatedButton(
                  onPressed: () async {
                    result = await showSuperadminPinConfirmationDialog(
                      context,
                      userRole: UserRole.superadmin,
                      expectedPin: '5678',
                    );
                  },
                  child: const Text('Open'),
                ),
              ),
            ),
          ),
        );

        await tester.tap(find.text('Open'));
        await tester.pumpAndSettle();

        // Simulate typing hardware keys '5', '6', '7', '8'
        await tester.sendKeyEvent(LogicalKeyboardKey.digit5);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.digit6);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.digit7);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.digit8);
        await tester.pumpAndSettle();

        expect(find.byType(PinConfirmationDialog), findsNothing);
        expect(result, isTrue);
      },
    );

    testWidgets('WT-MOB-PIN-CONFIRM-009 does not overflow at 2x text scale', (
      tester,
    ) async {
      tester.view.physicalSize = _phone;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        MaterialApp(
          theme: counterTheme,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(2)),
            child: child!,
          ),
          home: Builder(
            builder: (context) => Scaffold(
              body: ElevatedButton(
                onPressed: () => showSuperadminPinConfirmationDialog(
                  context,
                  userRole: UserRole.superadmin,
                  expectedPin: '1234',
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(PinConfirmationDialog), findsOneWidget);
    });
  });
}
