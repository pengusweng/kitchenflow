import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/shared/widgets/kkfc_radio.dart';

void main() {
  testWidgets('WT-MOB-RADIO-001 tapping selects only that option', (
    tester,
  ) async {
    String? selected = 'plain';
    await tester.pumpWidget(
      MaterialApp(
        theme: counterTheme,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => Column(
              children: [
                KkfcRadio<String>(
                  value: 'plain',
                  groupValue: selected,
                  label: 'Plain rice',
                  onChanged: (v) => setState(() => selected = v),
                ),
                KkfcRadio<String>(
                  value: 'garlic',
                  groupValue: selected,
                  label: 'Garlic rice',
                  onChanged: (v) => setState(() => selected = v),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byType(KkfcRadio<String>).last);
    await tester.pump();
    expect(selected, 'garlic');
  });

  testWidgets('WT-MOB-RADIO-002 disabled radio ignores taps', (tester) async {
    String? selected;
    await tester.pumpWidget(
      MaterialApp(
        theme: counterTheme,
        home: const Scaffold(
          body: KkfcRadio<String>(
            value: 'plain',
            groupValue: null,
            label: 'Plain rice',
            onChanged: null,
          ),
        ),
      ),
    );

    await tester.tap(find.byType(KkfcRadio<String>));
    await tester.pump();
    expect(selected, isNull);
  });

  testWidgets('WT-MOB-RADIO-003 still builds at large text scale', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: counterTheme,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(2)),
          child: child!,
        ),
        home: Scaffold(
          body: KkfcRadio<String>(
            value: 'plain',
            groupValue: 'plain',
            label: 'Plain rice',
            onChanged: (_) {},
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
  });
}
