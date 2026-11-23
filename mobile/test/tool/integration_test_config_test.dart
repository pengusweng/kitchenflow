import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import '../../tool/integration_test_config.dart';

void main() {
  late Directory mobile;
  late File orders;
  final config = {
    'ENV': 'test',
    'API_URL': 'http://10.0.2.2:3001/api',
    'TEST_USERNAME': 'cashier',
    'TEST_PASSWORD': 'fixture-password',
    'POS_BRAND_ID': 'brand',
    'POS_MENU_ITEM_ID': 'meal',
    'POS_UNAVAILABLE_ITEM_ID': 'sold-out-meal',
    'POS_MANAGER_USERNAME': 'supervisor',
    'POS_MANAGER_PASSWORD': 'fixture-password',
  };

  setUp(() async {
    mobile = await Directory.systemTemp.createTemp('kkfc-integration-config');
    orders = File.fromUri(mobile.uri.resolve('.fixtures/order-flow.json'));
    await orders.parent.create();
  });
  tearDown(() => mobile.delete(recursive: true));

  test('the runner identifies an old order fixture before building', () async {
    await orders.writeAsString(jsonEncode(config));
    await expectLater(
      integrationConfigArgs(mobile, 'orders', []),
      throwsA(
        isA<StateError>().having(
          (error) => error.message,
          'message',
          allOf(contains('POS_KITCHEN_USERNAME'), contains('prepare --orders')),
        ),
      ),
    );
  });

  test('an API URL override retains the generated credentials', () async {
    await orders.writeAsString(
      jsonEncode({
        ...config,
        'POS_KITCHEN_ID': 'kitchen-id',
        'POS_KITCHEN_USERNAME': 'kitchen',
        'POS_KITCHEN_PASSWORD': 'fixture-password',
      }),
    );
    const override = '--dart-define=API_URL=http://localhost:3001/api';
    expect(await integrationConfigArgs(mobile, 'orders', [override]), [
      '--dart-define-from-file=.fixtures/order-flow.json',
      override,
    ]);
  });
}
