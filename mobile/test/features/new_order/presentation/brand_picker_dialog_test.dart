import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/brand_colors.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/presentation/widgets/brands/brand_picker_dialog.dart';
import 'package:mobile/shared/widgets/button/types/primary_button.dart';

const _brandGamcheon = AssignedBrand(id: 'gc', code: 'GC', name: 'Gamcheon');
const _brandAurelias = AssignedBrand(
  id: 'ai',
  code: 'AI',
  name: "Aurelia's Inasal",
);
const _brandKingKungs = AssignedBrand(
  id: 'kk',
  code: 'KK',
  name: 'King Kungs Kafé',
);

const _prodBrands = [_brandGamcheon, _brandAurelias, _brandKingKungs];

void main() {
  Future<AssignedBrand?> openPicker(
    WidgetTester tester, {
    List<AssignedBrand> brands = _prodBrands,
    AssignedBrand current = _brandGamcheon,
  }) async {
    AssignedBrand? selected;
    await tester.pumpWidget(
      MaterialApp(
        theme: counterTheme,
        home: Scaffold(
          body: Builder(
            builder: (context) => Center(
              child: ElevatedButton(
                onPressed: () async {
                  selected = await showBrandPicker(
                    context,
                    brands: brands,
                    current: current,
                  );
                },
                child: const Text('Open Picker'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Picker'));
    await tester.pumpAndSettle();
    return selected;
  }

  testWidgets(
    'WT-MOB-BRAND-PICKER-001 renders brand image logos and codes for all standard brands',
    (tester) async {
      await openPicker(tester);

      // Dialog title & Eyebrow badge
      expect(find.text('Choose assigned brand'), findsOneWidget);
      expect(find.text('DEMO ACCOUNT · 3 ASSIGNED BRANDS'), findsOneWidget);

      // Verify Brand names and codes
      expect(find.text('Gamcheon'), findsOneWidget);
      expect(find.text('GC'), findsOneWidget);
      expect(find.text("Aurelia's Inasal"), findsOneWidget);
      expect(find.text('AI'), findsOneWidget);
      expect(find.text('King Kungs Kafé'), findsOneWidget);
      expect(find.text('KK'), findsOneWidget);

      // Verify Image assets rendered
      final imageWidgets = tester
          .widgetList<Image>(find.byType(Image))
          .toList();
      final imageSources = imageWidgets
          .map((img) => img.image)
          .whereType<AssetImage>()
          .map((asset) => asset.assetName)
          .toList();

      expect(imageSources, contains('assets/images/gamcheon.png'));
      expect(imageSources, contains('assets/images/aurelia.png'));
      expect(imageSources, contains('assets/images/king_kungs.png'));
    },
  );

  testWidgets(
    'WT-MOB-BRAND-PICKER-002 allows switching selected brand and applies brand color to continue button',
    (tester) async {
      AssignedBrand? result;
      await tester.pumpWidget(
        MaterialApp(
          theme: counterTheme,
          home: Scaffold(
            body: Builder(
              builder: (context) => Center(
                child: ElevatedButton(
                  onPressed: () async {
                    result = await showBrandPicker(
                      context,
                      brands: _prodBrands,
                      current: _brandGamcheon, // Starts with Gamcheon
                    );
                  },
                  child: const Text('Open Picker'),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Picker'));
      await tester.pumpAndSettle();

      // Gamcheon is initially selected -> button custom background is Gamcheon blue
      var primaryButton = tester.widget<KkfcPrimaryButton>(
        find.byType(KkfcPrimaryButton),
      );
      expect(primaryButton.customBackground, KkfcBrand.gamcheon.accent);

      // Select Aurelia's Inasal
      await tester.tap(find.text("Aurelia's Inasal"));
      await tester.pumpAndSettle();

      // Button background should now be Aurelia's warm terracotta
      primaryButton = tester.widget<KkfcPrimaryButton>(
        find.byType(KkfcPrimaryButton),
      );
      expect(primaryButton.customBackground, KkfcBrand.aurelias.accent);

      // Confirm selection
      await tester.tap(find.text('Continue with selected brand'));
      await tester.pumpAndSettle();

      expect(result, _brandAurelias);
      expect(result?.code, 'AI');
    },
  );

  testWidgets(
    'WT-MOB-BRAND-PICKER-003 renders gracefully with fallback for unknown or test brands',
    (tester) async {
      const customBrands = [
        AssignedBrand(id: 'c1', code: 'C1', name: 'Custom Brand 1'),
        AssignedBrand(id: 'c2', code: 'C2', name: 'Custom Brand 2'),
      ];

      await openPicker(tester, brands: customBrands, current: customBrands[0]);

      expect(find.text('Custom Brand 1'), findsWidgets);
      expect(find.text('C1'), findsOneWidget);
      expect(find.text('Custom Brand 2'), findsWidgets);
      expect(find.text('C2'), findsOneWidget);

      await tester.tap(find.text('Continue with selected brand'));
      await tester.pumpAndSettle();
    },
  );
}
