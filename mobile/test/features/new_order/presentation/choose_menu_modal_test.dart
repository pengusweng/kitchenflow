import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/theme/theme.dart';
import 'package:mobile/core/models/brand_models.dart';
import 'package:mobile/features/new_order/data/models/menu_models.dart';
import 'package:mobile/features/new_order/data/seed/sample_brands.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_selector/choose_menu_modal.dart';

void main() {
  group('ChooseMenuModal brand switching bottom sheet', () {
    testWidgets(
      'WT-MOB-CHOOSE-MODAL-001 reflects the design image with background images, fixed typos, and proper card states',
      (tester) async {
        tester.view.physicalSize = const Size(1024, 768);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        final authorizedBrands = sampleAssignedBrands
            .map(
              (b) => AssignedBrand(
                id: b.id,
                code: b.code,
                name: b.name,
                isAuthorized: true,
                channels: b.channels,
              ),
            )
            .toList();

        ({AssignedBrand brand, MenuChannel channel})? result;

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              theme: counterTheme,
              home: Scaffold(
                body: Builder(
                  builder: (context) => ElevatedButton(
                    onPressed: () async {
                      result = await showChooseMenuModal(
                        context,
                        brands: authorizedBrands,
                        currentBrand: authorizedBrands[0],
                        currentChannel: MenuChannel.dineIn,
                        showChannels: false,
                      );
                    },
                    child: const Text('Open Modal'),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        // Open modal
        await tester.tap(find.text('Open Modal'));
        await tester.pumpAndSettle();

        expect(find.byType(ChooseMenuModal), findsOneWidget);

        // 1. Header: verify the assigned brands badge is removed and title/subtitle are displayed
        expect(find.text('3 ASSIGNED BRANDS'), findsNothing);
        expect(find.byIcon(Icons.storefront_outlined), findsNothing);
        expect(find.text('Choose provider'), findsOneWidget);
        expect(
          find.text('Choose the provider for this menu.'),
          findsOneWidget,
        );

        // 2. All 3 brand cards are rendered with proper brand names
        expect(find.text('Gamcheon'), findsOneWidget);
        expect(find.text("Aurelia's Inasal"), findsOneWidget);
        expect(find.text('King Kungs Kafé'), findsOneWidget);

        // 3. Status text: Gamcheon is selected, Aurelia's and King Kungs are available
        expect(find.text('Selected provider'), findsOneWidget);
        expect(find.text('Available provider'), findsNWidgets(2));
        // Verify the AI typo 'Avaliable provider' is NOT present
        expect(find.textContaining('Avaliable'), findsNothing);

        // 4. Background images from mobile/assets/bg/ are rendered for each brand
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Image &&
                widget.image is AssetImage &&
                (widget.image as AssetImage).assetName ==
                    'assets/bg/gamcheon_bg.jpg',
          ),
          findsOneWidget,
        );
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Image &&
                widget.image is AssetImage &&
                (widget.image as AssetImage).assetName ==
                    'assets/bg/aurelias_bg.jpg',
          ),
          findsOneWidget,
        );
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Image &&
                widget.image is AssetImage &&
                (widget.image as AssetImage).assetName ==
                    'assets/bg/king_kungs_bg.jpg',
          ),
          findsOneWidget,
        );

        // 5. Brand logos are rendered
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Image &&
                widget.image is AssetImage &&
                (widget.image as AssetImage).assetName ==
                    'assets/images/gamcheon.png',
          ),
          findsOneWidget,
        );
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Image &&
                widget.image is AssetImage &&
                (widget.image as AssetImage).assetName ==
                    'assets/images/aurelia.png',
          ),
          findsOneWidget,
        );
        expect(
          find.byWidgetPredicate(
            (widget) =>
                widget is Image &&
                widget.image is AssetImage &&
                (widget.image as AssetImage).assetName ==
                    'assets/images/king_kungs.png',
          ),
          findsOneWidget,
        );

        // 5b. Solid white under-layer is rendered to guarantee WCAG AA contrast over dark photos
        expect(
          find.byWidgetPredicate(
            (widget) => widget is ColoredBox && widget.color == Colors.white,
          ),
          findsNWidgets(3),
        );

        // 6. Checkmark icon on selected card
        expect(find.byIcon(Icons.check_rounded), findsOneWidget);

        // 7. Action buttons
        expect(find.text('Switch provider'), findsOneWidget);
        expect(find.text('Cancel'), findsOneWidget);

        // 8. Tap Aurelia's Inasal to select it
        await tester.tap(
          find.byKey(
            ValueKey('select-provider-${sampleAssignedBrands[1].id}'),
          ),
        );
        await tester.pumpAndSettle();

        // Now Aurelia's is selected
        expect(find.byIcon(Icons.check_rounded), findsOneWidget);

        // 9. Tap 'Switch provider' to confirm
        await tester.tap(find.byKey(const ValueKey('switch-menu-button')));
        await tester.pumpAndSettle();

        // Modal closed and returned selected brand
        expect(find.byType(ChooseMenuModal), findsNothing);
        expect(result?.brand.id, sampleAssignedBrands[1].id);
      },
    );
  });
}
