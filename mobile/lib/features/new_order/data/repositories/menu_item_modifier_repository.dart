import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';

/// Loads the add-ons assigned to a menu item.
///
/// `GET /menu-item-modifiers/menu-item/:id` returns each assignment row with
/// its `modifier` record nested, so one request gives both the price and the
/// display name.
class MenuItemModifierRepository {
  MenuItemModifierRepository(this._dio);

  final Dio _dio;

  Future<List<ModifierGroup>> getForMenuItem(String menuItemId) async {
    final response = await _dio.get<List<dynamic>>(
      '/menu-item-modifiers/menu-item/$menuItemId',
    );
    final rows = response.data;
    if (rows is! List) {
      throw const FormatException('Invalid menu-item-modifiers response.');
    }

    final groups = <ModifierGroup>[];
    for (final row in rows) {
      if (row is! Map<String, dynamic>) {
        throw const FormatException('Invalid menu item modifier in response.');
      }
      final id = row['menu_item_modifier_id'];
      final modifierId = row['modifier_id'];
      final price = row['additional_price'];
      final modifier = row['modifier'];
      final name = modifier is Map<String, dynamic> ? modifier['name'] : null;
      if (id is! String || price == null || name is! String) {
        throw const FormatException('Menu item modifier is missing fields.');
      }
      // A retired modifier can't be ordered, so it isn't offered.
      if (modifier is Map<String, dynamic> && modifier['is_active'] == false) {
        continue;
      }
      groups.add(
        ModifierGroup.addOn(
          id: modifierId is String ? modifierId : id,
          name: name,
          priceCentavos: decimalToCentavos(price),
        ),
      );
    }
    return groups;
  }
}

final menuItemModifierRepositoryProvider = Provider<MenuItemModifierRepository>(
  (ref) => MenuItemModifierRepository(ref.watch(dioProvider)),
);
