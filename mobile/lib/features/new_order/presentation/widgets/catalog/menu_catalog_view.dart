import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/app_updates/optional_update_notice.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/presentation/widgets/brands/brand_switch_confirm_dialog.dart';
import 'package:mobile/features/new_order/presentation/widgets/catalog/catalog_pagination_bar.dart';
import 'package:mobile/features/new_order/presentation/widgets/catalog/catalog_search_bar.dart';
import 'package:mobile/features/new_order/presentation/widgets/catalog/catalog_view_mode_toggle.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_item_grid_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_selector/choose_menu_modal.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_selector/current_menu_card.dart';
import 'package:mobile/features/new_order/presentation/widgets/menu_states.dart';
import 'package:mobile/features/new_order/providers/brand_providers.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

/// The catalog view including menu selector, search/availability toggle,
/// and virtualized menu item grid/list.
class MenuCatalogView extends ConsumerWidget {
  const MenuCatalogView({
    super.key,
    required this.isWide,
    required this.bottomPadding,
  });

  final bool isWide;
  final double bottomPadding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeBrand = ref.watch(activeBrandProvider);
    final assignedBrands = ref.watch(assignedBrandsProvider);
    final selectedChannel = ref.watch(menuChannelProvider);
    final visibleItems = ref.watch(visibleMenuItemsProvider);
    final allItems = visibleItems.asData?.value;
    final totalItems = allItems?.length ?? 0;
    final totalPages = totalItems == 0
        ? 1
        : ((totalItems - 1) ~/ kMenuItemsPerPage) + 1;
    final currentPage = ref.watch(menuPageProvider).clamp(1, totalPages);
    final hasPagination = allItems != null && allItems.isNotEmpty;
    final viewMode = ref.watch(menuViewModeProvider);

    return RefreshIndicator(
      onRefresh: () async {
        try {
          ref.invalidate(brandsListProvider);
          ref.invalidate(menuItemsProvider);
          await ref.read(menuItemsProvider.future);
        } catch (_) {
          // The catalog's error state provides the retry action.
        }
      },
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                isWide ? KkfcSpace.s20 : KkfcSpace.s16,
                KkfcSpace.s12,
                isWide ? KkfcSpace.s20 : KkfcSpace.s16,
                KkfcSpace.s8,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const OptionalUpdateNotice(),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isSingleRow = constraints.maxWidth >= 720.0;

                      final menuSelector = ConstrainedBox(
                        constraints: const BoxConstraints(
                          minWidth: 140.0,
                          maxWidth: 220.0,
                        ),
                        child: CurrentMenuCard(
                          brand: activeBrand,
                          channel: selectedChannel,
                          showChannel: false,
                          compact: true,
                          onTap: () async {
                            final result = await showChooseMenuModal(
                              context,
                              brands: assignedBrands,
                              currentBrand: activeBrand,
                              currentChannel: selectedChannel,
                              showChannels: false,
                            );
                            if (result == null ||
                                result.brand.id == activeBrand.id ||
                                (result.brand.code.isNotEmpty &&
                                    result.brand.code.toUpperCase() ==
                                        activeBrand.code.toUpperCase())) {
                              return;
                            }
                            if (!context.mounted) return;

                            final cartCount = ref.read(cartCountProvider);
                            if (cartCount > 0) {
                              final confirmed = await showBrandSwitchConfirm(
                                context,
                                current: activeBrand,
                                target: result.brand,
                                cartCount: cartCount,
                              );
                              if (confirmed != true) return;
                              if (!context.mounted) return;
                              ref.read(cartProvider.notifier).clear();
                            }

                            ref
                                .read(activeBrandProvider.notifier)
                                .select(result.brand);
                          },
                        ),
                      );

                      if (isSingleRow) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            menuSelector,
                            const SizedBox(width: 8.0),
                            const Expanded(child: CatalogSearchBar()),
                            const SizedBox(width: 8.0),
                            const CatalogViewModeToggle(),
                          ],
                        );
                      }

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: menuSelector,
                                ),
                              ),
                              const SizedBox(width: 8.0),
                              const CatalogViewModeToggle(),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          const CatalogSearchBar(),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // 3. Menu Items Grid / List with native viewport virtualization (Zero shrinkWrap)
          SliverPadding(
            padding: EdgeInsets.fromLTRB(
              isWide ? KkfcSpace.s20 : KkfcSpace.s16,
              KkfcSpace.s4,
              isWide ? KkfcSpace.s20 : KkfcSpace.s16,
              hasPagination ? KkfcSpace.s12 : bottomPadding,
            ),
            sliver: visibleItems.when(
              loading: () => SliverToBoxAdapter(
                child: MenuGridSkeleton(isWide: isWide, viewMode: viewMode),
              ),
              error: (_, _) => SliverToBoxAdapter(
                child: MenuMessageCard(
                  icon: Icons.wifi_off,
                  title: "Couldn't load the menu",
                  body: 'Check the connection, then try again.',
                  actionLabel: 'Try again',
                  onAction: () {
                    ref.invalidate(brandsListProvider);
                    ref.invalidate(menuItemsProvider);
                  },
                ),
              ),
              data: (items) {
                if (items.isEmpty) {
                  final isSearching = ref
                      .watch(menuSearchProvider)
                      .trim()
                      .isNotEmpty;
                  final isHidingUnavailable = ref.watch(
                    hideUnavailableProvider,
                  );

                  if (isSearching || isHidingUnavailable) {
                    return SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(KkfcSpace.s40),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.search_off,
                                size: 40,
                                color: Color(0xFF76849A),
                              ),
                              const SizedBox(height: KkfcSpace.s12),
                              const Text(
                                'No items in this category or matching search',
                                style: TextStyle(
                                  fontFamily: KkfcFonts.ibmPlexSans,
                                  color: Color(0xFF586579),
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: KkfcSpace.s12),
                              TextButton(
                                onPressed: () {
                                  ref.read(menuSearchProvider.notifier).clear();
                                  ref
                                      .read(hideUnavailableProvider.notifier)
                                      .set(false);
                                },
                                child: const Text('Clear filters'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }

                  return SliverToBoxAdapter(
                    child: MenuMessageCard(
                      icon: Icons.restaurant_menu_outlined,
                      title: 'No menu items available',
                      body: 'No items found in this brand catalog.',
                      actionLabel: 'Refresh catalog',
                      onAction: () => ref.invalidate(menuItemsProvider),
                    ),
                  );
                }

                final startIndex = (currentPage - 1) * kMenuItemsPerPage;
                final endIndex =
                    (startIndex + kMenuItemsPerPage).clamp(0, items.length);
                final pageItems = items.sublist(startIndex, endIndex);

                if (viewMode == MenuViewMode.grid) {
                  final screenWidth = MediaQuery.sizeOf(context).width;
                  final isTabletOrDesktop = screenWidth >= 600.0;

                  final gridDelegate = !isTabletOrDesktop
                      ? const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12.0,
                          mainAxisSpacing: 12.0,
                          childAspectRatio: 1.0,
                        )
                      : (screenWidth >= 1400.0
                          ? const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 220.0,
                              crossAxisSpacing: 16.0,
                              mainAxisSpacing: 16.0,
                              childAspectRatio: 1.0,
                            )
                          : const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 4,
                              crossAxisSpacing: 16.0,
                              mainAxisSpacing: 16.0,
                              childAspectRatio: 1.0,
                            ));

                  return SliverGrid.builder(
                    gridDelegate: gridDelegate,
                    itemCount: pageItems.length,
                    itemBuilder: (context, index) => _AnimatedCatalogItem(
                      key: ValueKey(
                        'grid-$currentPage-${pageItems[index].id}',
                      ),
                      index: index,
                      child: MenuItemGridCard(
                        item: pageItems[index],
                        channel: selectedChannel,
                      ),
                    ),
                  );
                }

                return isWide
                    ? SliverGrid.builder(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 16.0,
                              mainAxisSpacing: 16.0,
                              mainAxisExtent: 180.0,
                            ),
                        itemCount: pageItems.length,
                        itemBuilder: (context, index) => _AnimatedCatalogItem(
                          key: ValueKey(
                            'list-wide-$currentPage-${pageItems[index].id}',
                          ),
                          index: index,
                          child: MenuItemCard(
                            item: pageItems[index],
                            channel: selectedChannel,
                            compact: false,
                          ),
                        ),
                      )
                    : SliverList.separated(
                        itemCount: pageItems.length,
                        separatorBuilder: (context, index) =>
                            const SizedBox(height: 12.0),
                        itemBuilder: (context, index) => _AnimatedCatalogItem(
                          key: ValueKey(
                            'list-compact-$currentPage-${pageItems[index].id}',
                          ),
                          index: index,
                          child: MenuItemCard(
                            item: pageItems[index],
                            channel: selectedChannel,
                            compact: true,
                          ),
                        ),
                      );
              },
            ),
          ),

          // 4. Pagination Footer Bar (16 items per page limit)
          if (hasPagination)
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                isWide ? KkfcSpace.s20 : KkfcSpace.s16,
                0.0,
                isWide ? KkfcSpace.s20 : KkfcSpace.s16,
                bottomPadding,
              ),
              sliver: SliverToBoxAdapter(
                child: CatalogPaginationBar(
                  currentPage: currentPage,
                  totalPages: totalPages,
                  totalItems: totalItems,
                  onPageChanged: (page) {
                    ref.read(menuPageProvider.notifier).setPage(page);
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Choreographed staggered entrance animation when switching between Grid and
/// List view modes (or pages), following [KkfcMotion] tokens:
/// - 240ms screen transition duration (`KkfcMotion.durScreen`)
/// - 18ms row/card stagger (`KkfcMotion.stagger`), capped at 10 items
/// - 6px vertical peer rise (`KkfcMotion.peerOffset`) + subtle scale & fade
class _AnimatedCatalogItem extends StatelessWidget {
  const _AnimatedCatalogItem({
    super.key,
    required this.index,
    required this.child,
  });

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final staggeredIndex = index.clamp(0, KkfcMotion.staggerMaxRows);
    final delayMs = staggeredIndex * KkfcMotion.stagger.inMilliseconds;
    final baseMs = KkfcMotion.durScreen.inMilliseconds;
    final totalMs = baseMs + delayMs;
    final startFraction = totalMs > 0 ? delayMs / totalMs : 0.0;

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: totalMs),
      builder: (context, value, child) {
        final rawProgress = startFraction >= 1.0
            ? 1.0
            : ((value - startFraction) / (1.0 - startFraction)).clamp(0.0, 1.0);
        final curved = Curves.easeOutCubic.transform(rawProgress);

        return Opacity(
          opacity: curved,
          child: Transform.translate(
            offset: Offset(0.0, (1.0 - curved) * KkfcMotion.peerOffset),
            child: Transform.scale(
              scale: 0.96 + (0.04 * curved),
              child: child,
            ),
          ),
        );
      },
      child: child,
    );
  }
}
