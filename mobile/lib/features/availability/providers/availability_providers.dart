import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/data/repositories/menu_repository.dart';
import 'package:mobile/features/new_order/data/seed/sample_menu.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';

final _uuidRegex = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

/// Loads every menu item in the active brand, including inactive items.
final availabilityMenuItemsProvider =
    FutureProvider.autoDispose<List<MenuItem>>((ref) async {
      final activeBrand = ref.watch(activeBrandProvider);
      var targetBrandId = activeBrand.id;

      if (!_uuidRegex.hasMatch(targetBrandId)) {
        try {
          final brands = await ref.watch(brandsListProvider.future);
          final match = brands.firstWhere(
            (b) =>
                b.code.toUpperCase() == activeBrand.code.toUpperCase() ||
                b.name.toLowerCase() == activeBrand.name.toLowerCase(),
            orElse: () => brands.first,
          );
          if (_uuidRegex.hasMatch(match.id)) {
            targetBrandId = match.id;
          }
        } catch (_) {}
      }

      if (!_uuidRegex.hasMatch(targetBrandId)) {
        return sampleMenuForBrand(activeBrand.code);
      }

      return ref
          .watch(menuRepositoryProvider)
          .getByBrand(targetBrandId, activeOnly: false);
    });
