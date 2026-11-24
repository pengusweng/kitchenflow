import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

/// Search input bar with animated focus ring, debounce, clear button,
/// folded item count, and an availability filter toggle chip.
class CatalogSearchBar extends ConsumerStatefulWidget {
  const CatalogSearchBar({super.key});

  @override
  ConsumerState<CatalogSearchBar> createState() => _CatalogSearchBarState();
}

class _CatalogSearchBarState extends ConsumerState<CatalogSearchBar> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  Timer? _searchDebounce;
  bool _searchFocused = false;
  bool _unavailablePressed = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      if (mounted) setState(() {});
    });
    _searchFocusNode.addListener(() {
      if (mounted) {
        setState(() => _searchFocused = _searchFocusNode.hasFocus);
      }
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 220), () {
      if (mounted) {
        ref.read(menuSearchProvider.notifier).set(query);
      }
    });
  }

  void _onClearSearch() {
    _searchController.clear();
    _searchDebounce?.cancel();
    ref.read(menuSearchProvider.notifier).clear();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<String>(menuSearchProvider, (_, query) {
      if (_searchController.text != query && !_searchFocusNode.hasFocus) {
        _searchController.text = query;
      }
    });

    final hideUnavailable = ref.watch(hideUnavailableProvider);
    final visibleCount =
        ref.watch(visibleMenuItemsProvider).asData?.value.length;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 320.0;

        final searchField = LayoutBuilder(
          builder: (context, searchConstraints) {
            final showTrailingBadge = searchConstraints.maxWidth >= 170.0 &&
                _searchController.text.isEmpty &&
                visibleCount != null;

            return AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOut,
              height: 40.0,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(KkfcRadius.sm),
                border: Border.all(
                  color: _searchFocused
                      ? KkfcColors.focus
                      : KkfcColors.border,
                  width: _searchFocused ? 1.5 : 1.0,
                ),
              ),
              child: TextField(
                controller: _searchController,
                focusNode: _searchFocusNode,
                onChanged: _onSearchChanged,
                textAlignVertical: TextAlignVertical.center,
                style: const TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: 13.5,
                  color: Color(0xFF19293E),
                ),
                decoration: InputDecoration(
                  isDense: true,
                  hintText: showTrailingBadge
                      ? 'Search...'
                      : (visibleCount != null && searchConstraints.maxWidth >= 130.0
                            ? 'Search $visibleCount items...'
                            : 'Search...'),
                  hintStyle: const TextStyle(
                    fontFamily: KkfcFonts.ibmPlexSans,
                    fontSize: 13.5,
                    color: Color(0xFF76849A),
                  ),
                  prefixIconConstraints: const BoxConstraints(
                    minWidth: 32.0,
                    minHeight: 32.0,
                  ),
                  prefixIcon: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 7.0),
                    child: Icon(
                      Icons.search,
                      size: 18,
                      color: Color(0xFF586579),
                    ),
                  ),
                  suffixIconConstraints: const BoxConstraints(
                    minWidth: 32.0,
                    minHeight: 32.0,
                  ),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: _onClearSearch,
                          padding: EdgeInsets.zero,
                          splashRadius: 16.0,
                        )
                      : (showTrailingBadge
                          ? Center(
                              widthFactor: 1.0,
                              child: Padding(
                                padding: const EdgeInsets.only(right: 10.0),
                                child: Text(
                                  'Showing $visibleCount item${visibleCount == 1 ? '' : 's'}',
                                  style: const TextStyle(
                                    fontFamily: KkfcFonts.ibmPlexSans,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w500,
                                    color: KkfcColors.ink3,
                                    height: 1.0,
                                  ),
                                ),
                              ),
                            )
                          : null),
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  disabledBorder: InputBorder.none,
                  errorBorder: InputBorder.none,
                  focusedErrorBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    vertical: 9.0,
                    horizontal: 4.0,
                  ),
                ),
              ),
            );
          },
        );

        final filterButton = AnimatedScale(
          scale: _unavailablePressed ? KkfcMotion.pressScale : 1.0,
          duration: KkfcMotion.durPress,
          curve: Curves.easeOut,
          child: Tooltip(
            message: hideUnavailable
                ? 'Showing available only'
                : 'Including unavailable items',
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                key: const ValueKey('unavailable-filter-button'),
                borderRadius: BorderRadius.circular(KkfcRadius.sm),
                onTapDown: (_) => setState(() => _unavailablePressed = true),
                onTapCancel: () => setState(() => _unavailablePressed = false),
                onTapUp: (_) => setState(() => _unavailablePressed = false),
                onTap: () {
                  HapticFeedback.selectionClick();
                  ref.read(hideUnavailableProvider.notifier).toggle();
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeInOut,
                  height: 40.0,
                  padding: EdgeInsets.symmetric(
                    horizontal: isNarrow ? 8.0 : 10.0,
                  ),
                  decoration: BoxDecoration(
                    color: hideUnavailable
                        ? (_unavailablePressed
                              ? const Color(0xFF151E2E)
                              : const Color(0xFF1D2940))
                        : (_unavailablePressed
                              ? const Color(0xFFEEE8DC)
                              : Colors.white),
                    borderRadius: BorderRadius.circular(KkfcRadius.sm),
                    border: Border.all(
                      color: hideUnavailable
                          ? const Color(0xFF1D2940)
                          : (_unavailablePressed
                                ? const Color(0xFF19293E)
                                : const Color(0xFFDDD6C9)),
                      width: 1.0,
                    ),
                    boxShadow: hideUnavailable
                        ? [
                            BoxShadow(
                              color: const Color(0xFF1D2940)
                                  .withValues(alpha: 0.18),
                              blurRadius: 5,
                              offset: const Offset(0, 1),
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        hideUnavailable
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 16,
                        color: hideUnavailable
                            ? Colors.white
                            : const Color(0xFF19293E),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        hideUnavailable
                            ? (isNarrow ? 'Available' : 'Available only')
                            : (isNarrow ? 'Unavailable' : 'Include unavailable'),
                        style: TextStyle(
                          fontFamily: KkfcFonts.ibmPlexSans,
                          fontSize: isNarrow ? 11.5 : 12.5,
                          fontWeight: FontWeight.w700,
                          color: hideUnavailable
                              ? Colors.white
                              : const Color(0xFF19293E),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );

        return Row(
          children: [
            Expanded(child: searchField),
            const SizedBox(width: 8.0),
            filterButton,
          ],
        );
      },
    );
  }
}
