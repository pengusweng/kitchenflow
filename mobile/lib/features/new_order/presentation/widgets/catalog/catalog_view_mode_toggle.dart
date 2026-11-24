import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';

/// Icon-only segmented view mode toggle with a spring-animated sliding pill
/// indicator allowing the cashier to switch seamlessly between Grid view and
/// List view for the menu catalog.
class CatalogViewModeToggle extends ConsumerWidget {
  const CatalogViewModeToggle({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewMode = ref.watch(menuViewModeProvider);
    final isGrid = viewMode == MenuViewMode.grid;

    return Container(
      height: 40.0,
      width: 77.0,
      decoration: BoxDecoration(
        color: KkfcColors.canvasSunken,
        borderRadius: BorderRadius.circular(KkfcRadius.sm),
      ),
      padding: const EdgeInsets.all(3.0),
      child: Stack(
        children: [
          // Sliding active selection pill with soft spring motion
          AnimatedAlign(
            duration: KkfcMotion.durRelease,
            curve: KkfcMotion.easeSpring,
            alignment: isGrid ? Alignment.centerLeft : Alignment.centerRight,
            child: Container(
              width: 34.0,
              height: 34.0,
              decoration: BoxDecoration(
                color: KkfcColors.selected,
                borderRadius: BorderRadius.circular(KkfcRadius.sm - 2),
                boxShadow: KkfcElevation.shadow1,
              ),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _ToggleSegment(
                key: const ValueKey('menu-view-mode-grid'),
                icon: Icons.grid_view_rounded,
                isSelected: isGrid,
                tooltip: 'Grid view',
                onTap: () {
                  if (!isGrid) {
                    HapticFeedback.selectionClick();
                    ref
                        .read(menuViewModeProvider.notifier)
                        .set(MenuViewMode.grid);
                  }
                },
              ),
              const SizedBox(width: 3.0),
              _ToggleSegment(
                key: const ValueKey('menu-view-mode-list'),
                icon: Icons.view_list_rounded,
                isSelected: !isGrid,
                tooltip: 'List view',
                onTap: () {
                  if (isGrid) {
                    HapticFeedback.selectionClick();
                    ref
                        .read(menuViewModeProvider.notifier)
                        .set(MenuViewMode.list);
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ToggleSegment extends StatefulWidget {
  const _ToggleSegment({
    super.key,
    required this.icon,
    required this.isSelected,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final bool isSelected;
  final String tooltip;
  final VoidCallback onTap;

  @override
  State<_ToggleSegment> createState() => _ToggleSegmentState();
}

class _ToggleSegmentState extends State<_ToggleSegment> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final fg = widget.isSelected ? Colors.white : KkfcColors.ink3;

    return Semantics(
      button: true,
      selected: widget.isSelected,
      label: widget.tooltip,
      child: Tooltip(
        message: widget.tooltip,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (_) => setState(() => _pressed = true),
          onTapUp: (_) => setState(() => _pressed = false),
          onTapCancel: () => setState(() => _pressed = false),
          onTap: widget.onTap,
          child: AnimatedScale(
            scale: _pressed ? KkfcMotion.pressScale : 1.0,
            duration: _pressed ? KkfcMotion.durPress : KkfcMotion.durRelease,
            curve: _pressed ? KkfcMotion.easeOut : KkfcMotion.easeSpring,
            child: SizedBox(
              width: 34.0,
              height: 34.0,
              child: Center(
                child: AnimatedSwitcher(
                  duration: KkfcMotion.durMicro,
                  child: Icon(
                    widget.icon,
                    key: ValueKey('${widget.icon.codePoint}-${widget.isSelected}'),
                    size: 18.0,
                    color: fg,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
