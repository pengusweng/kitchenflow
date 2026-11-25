import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/app/theme/brand_colors.dart';
import 'package:mobile/app/theme/status_colors.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/app/theme/ticket_age.dart';
import 'package:mobile/core/models/order_status.dart';

void main() {
  test('UT-MOB-THEME-EXT-001 every order status has a tone in both modes', () {
    for (final status in OrderStatus.values) {
      expect(KkfcStatusColors.light.toneFor(status).bg, isA<Color>());
      expect(KkfcStatusColors.dark.toneFor(status).fg, isA<Color>());
    }
  });

  test('UT-MOB-THEME-EXT-002 ticket age uses the proposed thresholds', () {
    expect(ticketAgeLevel(const Duration(minutes: 14)), TicketAgeLevel.normal);
    expect(ticketAgeLevel(const Duration(minutes: 15)), TicketAgeLevel.caution);
    expect(ticketAgeLevel(const Duration(minutes: 20)), TicketAgeLevel.caution);
    expect(ticketAgeLevel(const Duration(minutes: 30)), TicketAgeLevel.overdue);
  });

  test('UT-MOB-THEME-EXT-003 brand theme exposes the selected accent', () {
    final themed = themeForBrand(counterTheme, KkfcBrand.aurelias);
    expect(
      themed.extension<KkfcBrandColors>()!.accent,
      const Color(0xFF9A4A1F),
    );
  });

  test('UT-MOB-THEME-EXT-004 base themes carry status colors', () {
    expect(counterTheme.extension<KkfcStatusColors>(), isNotNull);
    expect(kitchenTheme.extension<KkfcStatusColors>(), isNotNull);
  });
}
