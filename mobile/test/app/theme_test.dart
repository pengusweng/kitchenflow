import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/app/theme/semantic_colors.dart';
import 'package:mobile/app/theme/theme.dart';

void main() {
  test('UT-MOB-THEME-001 counter theme uses the light token scheme', () {
    expect(counterTheme.colorScheme.brightness, Brightness.light);
    expect(counterTheme.colorScheme.primary, const Color(0xFF1D2940));
    expect(counterTheme.scaffoldBackgroundColor, const Color(0xFFF7F3EC));
    expect(counterTheme.extension<KkfcSemanticColors>(), isNotNull);
  });

  test('UT-MOB-THEME-002 kitchen theme uses the dark token scheme', () {
    expect(kitchenTheme.colorScheme.brightness, Brightness.dark);
    expect(kitchenTheme.colorScheme.primary, const Color(0xFFE3E7EF));
    expect(kitchenTheme.scaffoldBackgroundColor, const Color(0xFF0B111D));
    expect(kitchenTheme.extension<KkfcSemanticColors>(), isNotNull);
  });
}
