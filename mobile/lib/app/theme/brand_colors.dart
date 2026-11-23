import 'package:flutter/material.dart';

enum KkfcBrand {
  gamcheon(
    code: 'GC',
    displayName: 'Gamcheon',
    accent: Color(0xFF3D5A80),
    tint: Color(0xFFEEF3F8),
    logoAsset: 'assets/images/gamcheon.png',
  ),
  aurelias(
    code: 'AI',
    displayName: "Aurelia's Inasal",
    accent: Color(0xFF9A4A1F),
    tint: Color(0xFFFBF2EC),
    logoAsset: 'assets/images/aurelia.png',
  ),
  kingKungs(
    code: 'KK',
    displayName: 'King Kungs Kafé',
    accent: Color(0xFF5C4033),
    tint: Color(0xFFF5EFEA),
    logoAsset: 'assets/images/king_kungs.png',
  );

  const KkfcBrand({
    required this.code,
    required this.displayName,
    required this.accent,
    this.tint = const Color(0xFFF0F4F8),
    this.logoAsset,
  });

  final String code;
  final String displayName;
  final Color accent;
  final Color tint;
  final String? logoAsset;

  /// Resolves a [KkfcBrand] from a code or name, or null when not matched.
  static KkfcBrand? tryFrom(String? code, [String? name]) {
    final cleanCode = (code ?? '').trim().toUpperCase();
    for (final b in values) {
      if (b.code == cleanCode) return b;
    }
    final combined =
        '${(code ?? '').toLowerCase()} ${(name ?? '').toLowerCase()}';
    if (combined.contains('gamcheon') || combined.contains('gc')) {
      return gamcheon;
    }
    if (combined.contains('aurelia') ||
        combined.contains('inasal') ||
        combined.contains('ai')) {
      return aurelias;
    }
    if (combined.contains('king') ||
        combined.contains('kafe') ||
        combined.contains('kafé') ||
        combined.contains('kk')) {
      return kingKungs;
    }
    return null;
  }

  /// Returns the brand's accent color, falling back to a deterministic palette for custom/test brands.
  static Color colorFor(String? code, [String? name]) {
    final match = tryFrom(code, name);
    if (match != null) return match.accent;

    final key = '${code ?? ''}-${name ?? ''}';
    final hash = key.hashCode.abs();
    const fallbackPalette = [
      Color(0xFF2B4C7E), // Navy Blue
      Color(0xFF9A4A1F), // Terracotta
      Color(0xFF5C4033), // Espresso
      Color(0xFF2E6F40), // Forest Green
      Color(0xFF8E0B13), // Crimson
      Color(0xFF6B3A7D), // Royal Plum
    ];
    return fallbackPalette[hash % fallbackPalette.length];
  }

  /// Returns the subtle background tint for brand cards/tiles.
  static Color tintFor(String? code, [String? name]) {
    final match = tryFrom(code, name);
    if (match != null) return match.tint;
    final color = colorFor(code, name);
    return color.withValues(alpha: 0.08);
  }

  /// Returns the asset path for the brand's logo, or null when unknown.
  static String? logoFor(String? code, [String? name]) {
    final match = tryFrom(code, name);
    return match?.logoAsset;
  }
}

@immutable
class KkfcBrandColors extends ThemeExtension<KkfcBrandColors> {
  const KkfcBrandColors({required this.accent, required this.onAccent});

  factory KkfcBrandColors.of(KkfcBrand brand) =>
      KkfcBrandColors(accent: brand.accent, onAccent: const Color(0xFFFFFFFF));

  final Color accent;
  final Color onAccent;

  @override
  KkfcBrandColors copyWith({Color? accent, Color? onAccent}) => KkfcBrandColors(
    accent: accent ?? this.accent,
    onAccent: onAccent ?? this.onAccent,
  );

  @override
  KkfcBrandColors lerp(ThemeExtension<KkfcBrandColors>? other, double t) {
    if (other is! KkfcBrandColors) return this;
    return KkfcBrandColors(
      accent: Color.lerp(accent, other.accent, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
    );
  }
}

/// Applies a brand on top of a base mode theme (counterTheme or kitchenTheme).
ThemeData themeForBrand(ThemeData base, KkfcBrand brand) {
  return base.copyWith(
    extensions: [
      ...base.extensions.values.where((e) => e is! KkfcBrandColors),
      KkfcBrandColors.of(brand),
    ],
  );
}
