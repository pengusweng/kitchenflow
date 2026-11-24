import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

/// Simplified, low-chrome pagination footer that blends into the warm sand
/// canvas (16 items per page).
class CatalogPaginationBar extends StatelessWidget {
  const CatalogPaginationBar({
    super.key,
    required this.currentPage,
    required this.totalPages,
    required this.totalItems,
    required this.onPageChanged,
    this.pageSize = kMenuItemsPerPage,
  });

  final int currentPage;
  final int totalPages;
  final int totalItems;
  final int pageSize;
  final ValueChanged<int> onPageChanged;

  List<int?> _buildPageSequence(
    int current,
    int total, {
    required bool compact,
  }) {
    if (compact && total > 3) {
      return <int?>[current];
    }
    if (total <= 5) {
      return List<int?>.generate(total, (i) => i + 1);
    }
    if (current <= 3) {
      return <int?>[1, 2, 3, 4, null, total];
    }
    if (current >= total - 2) {
      return <int?>[1, null, total - 3, total - 2, total - 1, total];
    }
    return <int?>[1, null, current - 1, current, current + 1, null, total];
  }

  @override
  Widget build(BuildContext context) {
    final safeTotalPages = totalPages < 1 ? 1 : totalPages;
    final safeCurrentPage = currentPage.clamp(1, safeTotalPages);
    final startItem = totalItems == 0
        ? 0
        : ((safeCurrentPage - 1) * pageSize) + 1;
    final endItem = (safeCurrentPage * pageSize).clamp(0, totalItems);
    final canGoPrev = safeCurrentPage > 1;
    final canGoNext = safeCurrentPage < safeTotalPages;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 360.0;
        final showRangeSummary = constraints.maxWidth >= 420.0;
        final pages = _buildPageSequence(
          safeCurrentPage,
          safeTotalPages,
          compact: isCompact,
        );

        final rangeText = Text(
          '$startItem–$endItem of $totalItems',
          key: const ValueKey('menu-pagination-range'),
          style: const TextStyle(
            fontFamily: KkfcFonts.ibmPlexSans,
            fontSize: 12.5,
            fontWeight: FontWeight.w500,
            color: KkfcColors.ink3,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
        );

        final controls = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PaginationNavButton(
              buttonKey: const ValueKey('menu-pagination-prev'),
              icon: Icons.chevron_left_rounded,
              tooltip: 'Previous page',
              enabled: canGoPrev,
              onTap: () => onPageChanged(safeCurrentPage - 1),
            ),
            const SizedBox(width: 2.0),
            for (var i = 0; i < pages.length; i++) ...[
              if (i > 0) const SizedBox(width: 2.0),
              if (pages[i] == null)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6.0),
                  child: Text(
                    '…',
                    style: TextStyle(
                      fontFamily: KkfcFonts.ibmPlexSans,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                      color: KkfcColors.ink3,
                    ),
                  ),
                )
              else
                _PaginationPageButton(
                  page: pages[i]!,
                  isSelected: pages[i] == safeCurrentPage,
                  onTap: () => onPageChanged(pages[i]!),
                ),
            ],
            if (isCompact && safeTotalPages > 3) ...[
              const SizedBox(width: 4.0),
              Text(
                '/ $safeTotalPages',
                style: const TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: 12.0,
                  fontWeight: FontWeight.w500,
                  color: KkfcColors.ink3,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
            const SizedBox(width: 2.0),
            _PaginationNavButton(
              buttonKey: const ValueKey('menu-pagination-next'),
              icon: Icons.chevron_right_rounded,
              tooltip: 'Next page',
              enabled: canGoNext,
              onTap: () => onPageChanged(safeCurrentPage + 1),
            ),
          ],
        );

        return Container(
          key: const ValueKey('menu-pagination-bar'),
          padding: const EdgeInsets.only(top: 10.0, bottom: 4.0),
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: KkfcColors.divider, width: 1.0),
            ),
          ),
          child: showRangeSummary
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [rangeText, controls],
                )
              : Center(child: controls),
        );
      },
    );
  }
}

class _PaginationNavButton extends StatelessWidget {
  const _PaginationNavButton({
    required this.buttonKey,
    required this.icon,
    required this.tooltip,
    required this.enabled,
    required this.onTap,
  });

  final Key buttonKey;
  final IconData icon;
  final String tooltip;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fg = enabled ? KkfcColors.ink2 : const Color(0xFFC2BBB0);

    return Semantics(
      button: true,
      enabled: enabled,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            key: buttonKey,
            borderRadius: BorderRadius.circular(KkfcRadius.sm),
            onTap: enabled
                ? () {
                    HapticFeedback.selectionClick();
                    onTap();
                  }
                : null,
            child: SizedBox(
              width: 32.0,
              height: 32.0,
              child: Center(child: Icon(icon, size: 18.0, color: fg)),
            ),
          ),
        ),
      ),
    );
  }
}

class _PaginationPageButton extends StatelessWidget {
  const _PaginationPageButton({
    required this.page,
    required this.isSelected,
    required this.onTap,
  });

  final int page;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg = isSelected ? KkfcColors.selected : Colors.transparent;
    final fg = isSelected ? Colors.white : KkfcColors.ink2;

    return Semantics(
      button: true,
      selected: isSelected,
      label: 'Page $page',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          key: ValueKey('menu-pagination-page-$page'),
          borderRadius: BorderRadius.circular(KkfcRadius.sm),
          onTap: () {
            if (!isSelected) {
              HapticFeedback.selectionClick();
              onTap();
            }
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            curve: Curves.easeOutCubic,
            constraints: const BoxConstraints(minWidth: 32.0),
            height: 32.0,
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(KkfcRadius.sm),
            ),
            child: Center(
              child: Text(
                '$page',
                style: TextStyle(
                  fontFamily: KkfcFonts.ibmPlexSans,
                  fontSize: 12.5,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: fg,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
