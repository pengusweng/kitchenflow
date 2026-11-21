import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/app/theme/theme_context.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';

/// POS-optimized tactile 3x4 numeric keypad for PIN confirmation.
class PinConfirmationKeypad extends StatelessWidget {
  const PinConfirmationKeypad({
    super.key,
    required this.onDigitPressed,
    required this.onBackspacePressed,
    required this.onClearPressed,
    this.enabled = true,
  });

  /// Called when a numeric digit (0-9) is tapped.
  final ValueChanged<String> onDigitPressed;

  /// Called when the backspace key is tapped.
  final VoidCallback onBackspacePressed;

  /// Called when the clear key is tapped.
  final VoidCallback onClearPressed;

  /// Whether keypad buttons are interactive.
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildRow(context, ['1', '2', '3']),
        const SizedBox(height: KkfcSpace.s8),
        _buildRow(context, ['4', '5', '6']),
        const SizedBox(height: KkfcSpace.s8),
        _buildRow(context, ['7', '8', '9']),
        const SizedBox(height: KkfcSpace.s8),
        _buildBottomRow(context),
      ],
    );
  }

  Widget _buildRow(BuildContext context, List<String> digits) {
    return Row(
      children: digits.map((digit) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: KkfcSpace.s4),
            child: _KeypadButton(
              label: digit,
              enabled: enabled,
              onPressed: () {
                HapticFeedback.lightImpact();
                onDigitPressed(digit);
              },
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildBottomRow(BuildContext context) {
    return Row(
      children: [
        // Clear Button ("C")
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: KkfcSpace.s4),
            child: _KeypadButton(
              label: 'C',
              semanticLabel: 'Clear PIN',
              isMuted: true,
              enabled: enabled,
              onPressed: () {
                HapticFeedback.lightImpact();
                onClearPressed();
              },
            ),
          ),
        ),
        // Zero Button ("0")
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: KkfcSpace.s4),
            child: _KeypadButton(
              label: '0',
              enabled: enabled,
              onPressed: () {
                HapticFeedback.lightImpact();
                onDigitPressed('0');
              },
            ),
          ),
        ),
        // Backspace Button
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: KkfcSpace.s4),
            child: _KeypadButton(
              icon: Icons.backspace_outlined,
              semanticLabel: 'Delete last digit',
              isMuted: true,
              enabled: enabled,
              onPressed: () {
                HapticFeedback.lightImpact();
                onBackspacePressed();
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _KeypadButton extends StatelessWidget {
  const _KeypadButton({
    this.label,
    this.icon,
    this.semanticLabel,
    this.isMuted = false,
    required this.enabled,
    required this.onPressed,
  });

  final String? label;
  final IconData? icon;
  final String? semanticLabel;
  final bool isMuted;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final semantic = context.semanticColors;

    final effectiveColor = enabled
        ? (isMuted ? semantic.textSecondary : semantic.textPrimary)
        : semantic.textDisabled;

    return Semantics(
      button: true,
      enabled: enabled,
      label: semanticLabel ?? label,
      child: Material(
        color: semantic.bgSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(KkfcRadius.md),
          side: BorderSide(
            color: semantic.borderDefault,
            width: KkfcBorderWidth.thin,
          ),
        ),
        child: InkWell(
          onTap: enabled ? onPressed : null,
          borderRadius: BorderRadius.circular(KkfcRadius.md),
          splashColor: semantic.action.withValues(alpha: KkfcOpacity.pressed),
          highlightColor: semantic.action.withValues(alpha: KkfcOpacity.hover),
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              minHeight: KkfcTargets.posPrimary, // 56.0px for touch ergonomics
              maxHeight: KkfcTargets.posPrimary,
            ),
            child: Center(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: icon != null
                    ? Icon(
                        icon,
                        size: KkfcSizing.iconMd,
                        color: effectiveColor,
                      )
                    : Text(
                        label ?? '',
                        style: TextStyle(
                          fontFamily: KkfcFonts.schibstedGrotesk,
                          fontSize: isMuted ? 16.0 : 22.0,
                          fontWeight: isMuted
                              ? KkfcFontWeights.medium
                              : KkfcFontWeights.semiBold,
                          color: effectiveColor,
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
