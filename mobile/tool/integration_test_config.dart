import 'dart:convert';
import 'dart:io';

const _posKeys = [
  'TEST_USERNAME',
  'TEST_PASSWORD',
  'POS_BRAND_ID',
  'POS_MENU_ITEM_ID',
  'POS_UNAVAILABLE_ITEM_ID',
];

const _orderKeys = [
  'POS_MANAGER_USERNAME',
  'POS_MANAGER_PASSWORD',
  'POS_KITCHEN_ID',
  'POS_KITCHEN_USERNAME',
  'POS_KITCHEN_PASSWORD',
];

/// Validate the default fixture before starting an Android build. A custom
/// fixture file is handled by Flutter, which also supports .env files.
Future<List<String>> integrationConfigArgs(
  Directory mobileDirectory,
  String suite,
  List<String> forwarded,
) async {
  if (forwarded.any(
    (arg) =>
        arg == '--dart-define-from-file' ||
        arg.startsWith('--dart-define-from-file='),
  )) {
    return forwarded;
  }
  final path = switch (suite) {
    'orders' => '.fixtures/order-flow.json',
    'pos' => '.fixtures/pos-flow.json',
    _ => 'env/test-emulator.json',
  };
  final requiredKeys = [
    'API_URL',
    if (suite != 'auth') ..._posKeys,
    if (suite == 'orders') ..._orderKeys,
  ];
  final prepare = suite == 'auth'
      ? 'Restore mobile/$path.'
      : 'From server/, run npx.cmd ts-node -P prisma/tsconfig.seed.json prisma/mobile-pos-fixtures.ts prepare${suite == 'orders' ? ' --orders' : ''} with TEST_DATABASE_URL set for the test API.';
  final file = File.fromUri(mobileDirectory.uri.resolve(path));
  if (!await file.exists()) {
    throw StateError('Missing mobile/$path. $prepare');
  }
  final config = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
  for (var i = 0; i < forwarded.length; i++) {
    final arg = forwarded[i];
    final define = arg.startsWith('--dart-define=')
        ? arg.substring('--dart-define='.length)
        : arg == '--dart-define' && i + 1 < forwarded.length
        ? forwarded[++i]
        : null;
    final separator = define?.indexOf('=') ?? -1;
    if (define != null && separator > 0) {
      config[define.substring(0, separator)] = define.substring(separator + 1);
    }
  }
  final missing = requiredKeys.where((key) {
    final value = config[key];
    return value is! String || value.trim().isEmpty;
  }).toList();
  if (config['ENV'] != 'test') missing.add('ENV=test');
  if (missing.isNotEmpty) {
    throw StateError(
      'Invalid test config in mobile/$path. Missing or invalid: ${missing.join(', ')}. $prepare',
    );
  }
  return ['--dart-define-from-file=$path', ...forwarded];
}
