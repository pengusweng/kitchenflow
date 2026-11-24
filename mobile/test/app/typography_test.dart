import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/app/theme/status_icons.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/core/models/order_status.dart';

void main() {
  test('UT-MOB-TYPE-001 numbers use IBM Plex with tabular figures', () {
    expect(KkfcTypography.kdsTicket.fontFamily, KkfcFonts.numeric);
    expect(
      KkfcTypography.kdsTicket.fontFeatures,
      contains(const FontFeature.tabularFigures()),
    );
    expect(KkfcTypography.price.fontFamily, KkfcFonts.numeric);
  });

  test('UT-MOB-TYPE-002 item text uses Atkinson and references use mono', () {
    expect(KkfcTypography.kdsItem.fontFamily, KkfcFonts.text);
    expect(KkfcTypography.reference.fontFamily, KkfcFonts.mono);
  });

  test('UT-MOB-TYPE-003 line height matches the token value', () {
    // ty-kds-ticket: 48px / 52px
    expect(KkfcTypography.kdsTicket.height! * 48, closeTo(52, 0.001));
  });

  test('UT-MOB-TYPE-004 all font tokens resolve to Schibsted_Grotesk', () {
    expect(KkfcFonts.schibstedGrotesk, 'Schibsted_Grotesk');
    expect(KkfcFonts.ibmPlexSans, 'Schibsted_Grotesk');
    expect(KkfcFonts.numeric, 'Schibsted_Grotesk');
    expect(KkfcFonts.text, 'Schibsted_Grotesk');
    expect(KkfcFonts.mono, 'Schibsted_Grotesk');
    expect(KkfcFonts.systemMono, 'Schibsted_Grotesk');
  });

  test('UT-MOB-TYPE-005 every order status has an icon', () {
    for (final status in OrderStatus.values) {
      expect(statusIcon(status), isA<IconData>());
    }
  });
}
