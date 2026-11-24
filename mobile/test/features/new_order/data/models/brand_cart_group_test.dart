import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';

void main() {
  const channel = MenuChannel.dineIn;

  const item1 = MenuItem(
    id: 'item-1',
    name: 'Gamcheon Bulgogi',
    description: '',
    pricesCentavos: {MenuChannel.dineIn: 25000},
  );

  const item2 = MenuItem(
    id: 'item-2',
    name: 'Gamcheon Kimchi Rice',
    description: '',
    pricesCentavos: {MenuChannel.dineIn: 18000},
  );

  const item3 = MenuItem(
    id: 'item-3',
    name: 'King Kungs Cafe Iced Latte',
    description: '',
    pricesCentavos: {MenuChannel.dineIn: 12000},
  );

  const item4 = MenuItem(
    id: 'item-4',
    name: "Aurelia's Inasal Quarter Chicken",
    description: '',
    pricesCentavos: {MenuChannel.dineIn: 22000},
  );

  group('groupCartLinesByBrand', () {
    test(
      'UT-MOB-CART-GROUP-001 returns an empty list when cart has no lines',
      () {
        final groups = groupCartLinesByBrand([]);
        expect(groups, isEmpty);
      },
    );

    test('UT-MOB-CART-GROUP-002 groups items belonging to a single brand under one group', () {
      final lines = [
        const CartLine(
          id: 'line-1',
          brandId: 'gc-uuid',
          brandName: 'Gamcheon',
          item: item1,
          quantity: 2,
        ),
        const CartLine(
          id: 'line-2',
          brandId: 'gc-uuid',
          brandName: 'Gamcheon',
          item: item2,
          quantity: 1,
        ),
      ];

      final groups = groupCartLinesByBrand(lines);

      expect(groups.length, 1);
      final gcGroup = groups.first;
      expect(gcGroup.brandId, 'gc-uuid');
      expect(gcGroup.brandName, 'Gamcheon');
      expect(gcGroup.lines.length, 2);
      expect(gcGroup.totalQuantity, 3);
      // 25000 * 2 + 18000 * 1 = 68000
      expect(gcGroup.totalCentavos(channel), 68000);
    });

    test('UT-MOB-CART-GROUP-003 splits multiple brands into distinct groups preserving insertion order', () {
      final lines = [
        const CartLine(
          id: 'line-1',
          brandId: 'gc-uuid',
          brandName: 'Gamcheon',
          item: item1,
          quantity: 1,
        ),
        const CartLine(
          id: 'line-2',
          brandId: 'kk-uuid',
          brandName: 'King Kungs Cafe',
          item: item3,
          quantity: 2,
        ),
        const CartLine(
          id: 'line-3',
          brandId: 'ai-uuid',
          brandName: "Aurelia's Inasal",
          item: item4,
          quantity: 1,
        ),
        const CartLine(
          id: 'line-4',
          brandId: 'gc-uuid',
          brandName: 'Gamcheon',
          item: item2,
          quantity: 3,
        ),
      ];

      final groups = groupCartLinesByBrand(lines);

      expect(groups.length, 3);
      expect(groups[0].brandName, 'Gamcheon');
      expect(groups[0].lines.length, 2);
      expect(groups[0].totalQuantity, 4); // 1 + 3
      expect(groups[0].totalCentavos(channel), 25000 * 1 + 18000 * 3);

      expect(groups[1].brandName, 'King Kungs Cafe');
      expect(groups[1].lines.length, 1);
      expect(groups[1].totalQuantity, 2);
      expect(groups[1].totalCentavos(channel), 12000 * 2);

      expect(groups[2].brandName, "Aurelia's Inasal");
      expect(groups[2].lines.length, 1);
      expect(groups[2].totalQuantity, 1);
      expect(groups[2].totalCentavos(channel), 22000);
    });

    test('UT-MOB-CART-GROUP-004 handles lines with empty brandId gracefully using brandName', () {
      final lines = [
        const CartLine(
          id: 'line-1',
          brandId: '',
          brandName: 'King Kungs Cafe',
          item: item3,
          quantity: 1,
        ),
      ];

      final groups = groupCartLinesByBrand(lines);
      expect(groups.length, 1);
      expect(groups.first.brandName, 'King Kungs Cafe');
    });

    test('UT-MOB-CART-GROUP-005 handles lines with empty brandId and empty brandName using fallback', () {
      final lines = [
        const CartLine(
          id: 'line-1',
          brandId: '',
          brandName: '',
          item: item3,
          quantity: 1,
        ),
      ];

      final groups = groupCartLinesByBrand(lines);
      expect(groups.length, 1);
      expect(groups.first.brandName, 'Other items');
    });
  });
}
