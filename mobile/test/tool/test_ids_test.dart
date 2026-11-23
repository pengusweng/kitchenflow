import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../../tool/gherkin_scenarios.dart';

void main() {
  test('UT-MOB-TEST-IDS-001 mobile test IDs are unique and match the harness and feature tags', () {
    final declarations = <String, String>{};
    final problems = <String>[];
    final deviceIds = <String>{};
    final testCall = RegExp(
      r'^\s*(test|testWidgets|goldenTest)\s*\(',
      multiLine: true,
    );
    final titleStart = RegExp(r'''^\s*['"]([A-Z0-9-]+)(?=[:\s])''');

    for (final directory in ['test', 'integration_test']) {
      for (final file in Directory(
        directory,
      ).listSync(recursive: true).whereType<File>()) {
        if (!file.path.endsWith('_test.dart')) continue;
        final source = file.readAsStringSync();
        for (final call in testCall.allMatches(source)) {
          final prefix = titleStart
              .firstMatch(source.substring(call.end))
              ?.group(1);
          final id = prefix == null ? null : mobileTestId(prefix);
          final location =
              '${file.path}:${'\n'.allMatches(source.substring(0, call.end)).length + 1}';
          final allowedKinds = directory == 'integration_test'
              ? ['IT', 'E2E']
              : [
                  switch (call.group(1)) {
                    'testWidgets' => 'WT',
                    'goldenTest' => 'GT',
                    _ => 'UT',
                  },
                ];
          if (id == null || !allowedKinds.contains(id.split('-').first)) {
            problems.add(
              '$location needs a ${allowedKinds.join('/')} mobile test ID at the start of its title.',
            );
            continue;
          }
          final earlier = declarations[id];
          if (earlier != null) {
            problems.add('$location repeats $id from $earlier.');
          }
          declarations[id] = location;
          if (directory == 'integration_test') deviceIds.add(id);
        }
      }
    }

    final specs = <String>{};
    for (final file in Directory(
      '../features/mobile',
    ).listSync().whereType<File>()) {
      if (!file.path.endsWith('.feature')) continue;
      for (final line in file.readAsLinesSync().where(
        (line) => line.trimLeft().startsWith('@'),
      )) {
        final tags = line.trim().split(RegExp(r'\s+'));
        for (final tag in tags.where((tag) => tag.contains('-MOB-'))) {
          final id = tag.substring(1);
          if (!specs.add(id)) problems.add('${file.path} repeats $id.');
          if (!tags.contains('@planned') && !declarations.containsKey(id)) {
            problems.add('${file.path} has no executable test for $id.');
          }
        }
      }
    }
    for (final id in deviceIds.difference(specs)) {
      problems.add('${declarations[id]} has no feature scenario for $id.');
    }
    expect(problems, isEmpty, reason: problems.join('\n'));
  });
}
