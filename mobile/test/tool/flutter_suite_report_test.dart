import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';

import '../../tool/flutter_suite_report.dart';
import '../../tool/gherkin_scenarios.dart';
import '../../tool/integration_report.dart';

void main() {
  test(
    'UT-MOB-REPORT-001 classifies the test APIs and distinguishes mixed files',
    () {
      expect(categoryForTestSource('  test(\'case\', () {});'), 'Unit');
      expect(
        categoryForTestSource('  testWidgets(\'case\', (t) {});'),
        'Widget',
      );
      expect(
        categoryForTestSource('  goldenTest(\'case\', builder: build);'),
        'Golden',
      );
      expect(
        categoryForTestSource('test(\n);\ntestWidgets(\n);'),
        'Unit / widget',
      );
      expect(categoryForTestSource('unknown runner'), 'Unclassified');
      expect(
        categoryForTestSource("test('a name containing goldenTest(', () {});"),
        'Unit',
      );
    },
  );

  test('UT-MOB-REPORT-002 preserves suite paths and generates categories and Gherkin per result', () {
    final parser = IntegrationReport();
    void event(Map<String, dynamic> value) => parser.addLine(jsonEncode(value));
    final sources = {
      '/repo/mobile/test/cart_test.dart':
          "test('cart', () {});\ntestWidgets('cart widget', (t) {});",
      '/repo/mobile/test/login_test.dart': "testWidgets('login', (t) {});",
      '/repo/mobile/test/button_golden_test.dart': "goldenTest('button');",
    };
    final names = [
      'UT-MOB-CART-001 Given an empty cart When adding an item Then the cart has one item',
      'WT-MOB-LOGIN-001 login renders <script> safely',
      'GT-MOB-LOADING-BUTTON-001 idle at 360dp and 1.0x text',
    ];
    for (var i = 0; i < names.length; i++) {
      event({
        'type': 'suite',
        'suite': {'id': i, 'path': sources.keys.elementAt(i)},
      });
      event({
        'type': 'testStart',
        'time': 0,
        'test': {'id': i, 'suiteID': i, 'name': names[i]},
      });
      event({
        'type': 'testDone',
        'time': 20,
        'testID': i,
        'result': i == 2 ? 'failure' : 'success',
        'hidden': false,
      });
    }
    event({'type': 'done', 'success': false});
    final summary = parser.summarize(
      exitCode: 1,
      started: DateTime.utc(2026),
      finished: DateTime.utc(2026),
      arguments: [],
    );
    describeFlutterSuite(summary, sources);
    expect(summary['categoryCounts']['Unit']['Passed'], 1);
    expect(summary['categoryCounts']['Widget']['Passed'], 1);
    expect(summary['categoryCounts']['Golden']['Failed'], 1);
    expect(summary['status'], 'Failed');
    final scenarios = summary['scenarios'] as List;
    expect(scenarios, hasLength(3));
    expect(scenarios.map((s) => s['id']), [
      'UT-MOB-CART-001',
      'WT-MOB-LOGIN-001',
      'GT-MOB-LOADING-BUTTON-001',
    ]);
    expect(
      scenarios[0]['gherkin'],
      contains(
        'Given an empty cart\n  When adding an item\n  Then the cart has one item',
      ),
    );
    expect(scenarios[2]['gherkin'], contains('configured golden baseline'));
    expect(gherkinWithResults(summary), contains('@golden'));
    expect(gherkinWithResults(summary), contains('@GT-MOB-LOADING-BUTTON-001'));
    final html = reportHtml(summary);
    expect(html, contains('test-results.feature'));
    expect(html, contains('Results by test type'));
    expect(html, contains('&lt;script&gt;'));
    expect(html, isNot(contains('<script>')));
  });

  test('UT-MOB-REPORT-003 scenario IDs are stable across ordering and distinct across files', () {
    Map<String, dynamic> make(List<Map<String, dynamic>> tests) => {
      'tests': tests,
    };
    final first = make([
      {
        'name': 'same name',
        'source': '/repo/mobile/test/a_test.dart',
        'status': 'Passed',
      },
      {
        'name': 'same name',
        'source': '/repo/mobile/test/b_test.dart',
        'status': 'Skipped',
      },
    ]);
    final reversed = make(
      (first['tests'] as List).reversed
          .map((t) => Map<String, dynamic>.from(t))
          .toList(),
    );
    describeFlutterSuite(first, {});
    describeFlutterSuite(reversed, {});
    final ids = (first['scenarios'] as List).map((s) => s['id']).toList();
    expect(ids.toSet(), hasLength(2));
    expect((reversed['scenarios'] as List).map((s) => s['id']), ids.reversed);
    expect(first['scenarios'][1]['status'], 'Skipped');
  });

  test('UT-MOB-REPORT-011 parameter variants retain the declared ID and separate execution IDs', () {
    final report = {
      'status': 'Failed',
      'tests': [
        for (final variant in ['idle', 'loading'])
          <String, dynamic>{
            'name': 'GT-MOB-LOADING-BUTTON-001 $variant button',
            'source': '/repo/mobile/test/button_golden_test.dart',
            'status': variant == 'idle' ? 'Passed' : 'Failed',
          },
      ],
    };
    describeFlutterSuite(report, {});
    final scenarios = report['scenarios'] as List;
    expect(
      scenarios.map((s) => s['id']),
      everyElement('GT-MOB-LOADING-BUTTON-001'),
    );
    expect(scenarios.map((s) => s['caseId']).toSet(), hasLength(2));
    expect(scenarios.map((s) => s['status']), ['Passed', 'Failed']);
  });
}
