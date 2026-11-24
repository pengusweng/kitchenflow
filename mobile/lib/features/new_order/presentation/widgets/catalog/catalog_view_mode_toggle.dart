import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

/// Segmented view mode toggle allowing the cashier to switch seamlessly between
/// Grid view and List view for the menu catalog.
class CatalogViewModeToggle extends ConsumerWidget {
  const CatalogViewModeToggle({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewMode = ref.watch(menuViewModeProvider);

    return Container(
      height: 36.0,
      decoration: BoxDecoration(
        color: const Color(0xFFF0EAE1),
        borderRadius: BorderRadius.circular(KkfcRadius.sm),
        border: Border.all(
          color: const Color(0xFFDDD6C9),
          width: 1.0,
        ),
      ),
      padding: const EdgeInsets.all(2.5),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToggleSegment(
            key: const ValueKey('menu-view-mode-grid'),
            label: 'Grid',
            icon: Icons.grid_view_rounded,
            isSelected: viewMode == MenuViewMode.grid,
            tooltip: 'Grid view',
            onTap: () {
              if (viewMode != MenuViewMode.grid) {
                HapticFeedback.selectionClick();
                ref
                    .read(menuViewModeProvider.notifier)
                    .set(MenuViewMode.grid);
              }
            },
          ),
          const SizedBox(width: 2.0),
          _ToggleSegment(
            key: const ValueKey('menu-view-mode-list'),
            label: 'List',
            icon: Icons.view_list_rounded,
            isSelected: viewMode == MenuViewMode.list,
            tooltip: 'List view',
            onTap: () {
              if (viewMode != MenuViewMode.list) {
                HapticFeedback.selectionClick();
                ref
                    .read(menuViewModeProvider.notifier)
                    .set(MenuViewMode.list);
              }
            },
          ),
        ],
      ),
    );
  }
}

class _ToggleSegment extends StatelessWidget {
  const _ToggleSegment({
    super.key,
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.tooltip,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool isSelected;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selectedBg = const Color(0xFF1D2940);
    final selectedFg = Colors.white;
    final unselectedFg = const Color(0xFF586579);

    return Semantics(
      button: true,
      selected: isSelected,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(KkfcRadius.sm - 2),
            onTap: onTap,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 10.0),
              decoration: BoxDecoration(
                color: isSelected ? selectedBg : Colors.transparent,
                borderRadius: BorderRadius.circular(KkfcRadius.sm - 2),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: selectedBg.withValues(alpha: 0.22),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ]
                    : null,
              ),
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 16.0,
                      color: isSelected ? selectedFg : unselectedFg,
                    ),
                    const SizedBox(width: 5.0),
                    Text(
                      label,
                      style: TextStyle(
                        fontFamily: KkfcFonts.ibmPlexSans,
                        fontSize: 12.5,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w600,
                        color: isSelected ? selectedFg : unselectedFg,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
