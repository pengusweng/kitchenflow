import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/data/repositories/menu_item_modifier_repository.dart';

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this._handler);

  final ResponseBody Function(RequestOptions options) _handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async => _handler(options);

  @override
  void close({bool force = false}) {}
}

ResponseBody _json(String body) => ResponseBody.fromString(
  body,
  200,
  headers: {
    Headers.contentTypeHeader: [Headers.jsonContentType],
  },
);

void main() {
  test('UT-MOB-MIM-001 add-ons come from one request, named by the nested modifier, retired ones skipped', () async {
    final requested = <String>[];
    final dio = Dio();
    dio.httpClientAdapter = _FakeAdapter((options) {
      requested.add(options.path);
      if (options.path == '/menu-item-modifiers/menu-item/item-1') {
        return _json(
          '[{"menu_item_modifier_id":"mim-1","modifier_id":"mod-egg","additional_price":"20.00","modifier":{"name":"Add egg","is_active":true}},'
          '{"menu_item_modifier_id":"mim-2","modifier_id":"mod-old","additional_price":"5.00","modifier":{"name":"Retired","is_active":false}}]',
        );
      }
      throw StateError('Unexpected request: ${options.path}');
    });

    final groups = await MenuItemModifierRepository(dio)
        .getForMenuItem('item-1');

    expect(requested, ['/menu-item-modifiers/menu-item/item-1']);
    expect(groups, hasLength(1));
    expect(groups.single.id, 'mod-egg');
    expect(groups.single.title, 'Add egg');
    expect(groups.single.isAddOn, isTrue);
    expect(
      groups.single.options
          .firstWhere((option) => option.id == ModifierGroup.addOnOn)
          .priceDeltaCentavos,
      2000,
    );
  });

  test('UT-MOB-MIM-002 rejects a row without its modifier name', () async {
    final dio = Dio();
    dio.httpClientAdapter = _FakeAdapter(
      (_) => _json(
        '[{"menu_item_modifier_id":"mim-1","modifier_id":"mod-egg","additional_price":"20.00"}]',
      ),
    );

    await expectLater(
      MenuItemModifierRepository(dio).getForMenuItem('item-1'),
      throwsFormatException,
    );
  });
}
