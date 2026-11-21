import 'package:flutter/material.dart';
import 'package:mobile/app/theme/theme_context.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';
import 'package:mobile/shared/widgets/button/button.dart';

import 'pin_confirmation_dots.dart';
import 'pin_confirmation_keypad.dart';

/// Presentational card for the PIN confirmation dialog.
class PinConfirmationCard extends StatelessWidget {
  const PinConfirmationCard({
    super.key,
    required this.title,
    this.subtitle,
    this.roleBadgeLabel = 'SUPERADMIN PRIVILEGE',
    required this.pinLength,
    required this.enteredPinLength,
    required this.hasError,
    this.errorMessage,
    required this.shakeAnimation,
    this.isVerifying = false,
    required this.onDigitPressed,
    required this.onBackspacePressed,
    required this.onClearPressed,
    required this.onCancel,
    required this.onConfirm,
    this.actionLabel = 'Authorize',
  });

  /// Dialog headline (e.g. 'Superadmin Authorization' or 'Authorize Void').
  final String title;

  /// Explanatory copy describing the privileged action being authorized.
  final String? subtitle;

  /// Label displayed inside the privileged role pill.
  final String roleBadgeLabel;

  /// Required number of PIN digits (typically 4).
  final int pinLength;

  /// Current number of entered digits.
  final int enteredPinLength;

  /// Whether current input is in an error state.
  final bool hasError;

  /// Optional error message to display when PIN verification fails.
  final String? errorMessage;

  /// Animation driving the lateral shake when an error occurs.
  final Animation<double> shakeAnimation;

  /// Whether verification is in progress.
  final bool isVerifying;

  /// Callback when a numeric digit is entered.
  final ValueChanged<String> onDigitPressed;

  /// Callback when backspace is pressed.
  final VoidCallback onBackspacePressed;

  /// Callback when clear is pressed.
  final VoidCallback onClearPressed;

  /// Callback when Cancel button is tapped.
  final VoidCallback onCancel;

  /// Callback when Confirm / Authorize button is tapped.
  final VoidCallback onConfirm;

  /// Label for the primary action button (defaults to 'Authorize').
  final String actionLabel;

  @override
  Widget build(BuildContext context) {
    final semantic = context.semanticColors;
    final isPinComplete = enteredPinLength == pinLength;

    return Material(
      color: semantic.bgSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KkfcRadius.lg),
        side: BorderSide(
          color: semantic.borderDefault,
          width: KkfcBorderWidth.thin,
        ),
      ),
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Security Accent line at top
          Container(
            height: KkfcBorderWidth.focus,
            color: semantic.action,
          ),

          Padding(
            padding: const EdgeInsets.all(KkfcSpace.s24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Role Badge Eyebrow
                Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: KkfcSpace.s12,
                      vertical: KkfcSpace.s4,
                    ),
                    decoration: BoxDecoration(
                      color: semantic.actionTint,
                      borderRadius: BorderRadius.circular(KkfcRadius.pill),
                      border: Border.all(
                        color: semantic.action.withValues(alpha: 0.35),
                        width: KkfcBorderWidth.thin,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.admin_panel_settings_rounded,
                          size: KkfcSizing.iconSm,
                          color: semantic.actionInk,
                        ),
                        const SizedBox(width: KkfcSpace.s4),
                        Flexible(
                          child: Text(
                            roleBadgeLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontFamily: KkfcFonts.schibstedGrotesk,
                              fontSize: KkfcTextSizes.textXs,
                              fontWeight: KkfcFontWeights.bold,
                              letterSpacing: 0.5,
                              color: semantic.actionInk,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: KkfcSpace.s16),

                // Dialog Title
                Semantics(
                  header: true,
                  child: Text(
                    title,
                    style: TextStyle(
                      fontFamily: KkfcFonts.schibstedGrotesk,
                      fontSize: KkfcTextSizes.textXl,
                      fontWeight: KkfcFontWeights.bold,
                      color: semantic.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: KkfcSpace.s8),

                // Description Subtitle
                Text(
                  subtitle ??
                      'Enter your $pinLength-digit superadmin PIN to authorize this privileged action.',
                  style: TextStyle(
                    fontFamily: KkfcFonts.schibstedGrotesk,
                    fontSize: KkfcTextSizes.textMd,
                    fontWeight: KkfcFontWeights.regular,
                    color: semantic.textSecondary,
                  ),
                ),
                const SizedBox(height: KkfcSpace.s24),

                // PIN Dots Display
                PinConfirmationDots(
                  length: pinLength,
                  filledCount: enteredPinLength,
                  hasError: hasError,
                  shakeAnimation: shakeAnimation,
                  isVerifying: isVerifying,
                ),
                const SizedBox(height: KkfcSpace.s16),

                // Error Banner (if error present)
                AnimatedSwitcher(
                  duration: KkfcMotion.durMicro,
                  child: errorMessage != null
                      ? Container(
                          key: const ValueKey('pin-error-banner'),
                          padding: const EdgeInsets.symmetric(
                            horizontal: KkfcSpace.s12,
                            vertical: KkfcSpace.s8,
                          ),
                          decoration: BoxDecoration(
                            color: semantic.danger.bg,
                            borderRadius: BorderRadius.circular(KkfcRadius.sm),
                            border: Border.all(
                              color: semantic.danger.border ?? semantic.danger.fg,
                              width: KkfcBorderWidth.thin,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.error_outline_rounded,
                                size: KkfcSizing.iconSm,
                                color: semantic.danger.fg,
                              ),
                              const SizedBox(width: KkfcSpace.s8),
                              Expanded(
                                child: Text(
                                  errorMessage!,
                                  style: TextStyle(
                                    fontFamily: KkfcFonts.schibstedGrotesk,
                                    fontSize: KkfcTextSizes.textSm,
                                    fontWeight: KkfcFontWeights.medium,
                                    color: semantic.danger.fg,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )
                      : const SizedBox(
                          key: ValueKey('pin-error-spacer'),
                          height: KkfcSpace.s16,
                        ),
                ),
                const SizedBox(height: KkfcSpace.s12),

                // Tactile On-Screen Keypad
                PinConfirmationKeypad(
                  enabled: !isVerifying,
                  onDigitPressed: onDigitPressed,
                  onBackspacePressed: onBackspacePressed,
                  onClearPressed: onClearPressed,
                ),
                const SizedBox(height: KkfcSpace.s24),

                // Footer Actions Row
                Row(
                  children: [
                    // Cancel Action
                    Expanded(
                      child: KkfcOutlinedButton(
                        label: 'Cancel',
                        size: KkfcButtonSize.standard,
                        intent: KkfcButtonIntent.neutral,
                        onPressed: isVerifying ? null : onCancel,
                      ),
                    ),
                    const SizedBox(width: KkfcSpace.s12),
                    // Authorize / Confirm Action
                    Expanded(
                      child: KkfcPrimaryButton(
                        label: actionLabel,
                        size: KkfcButtonSize.standard,
                        isLoading: isVerifying,
                        loadingLabel: 'Verifying...',
                        onPressed: (!isVerifying && isPinComplete)
                            ? onConfirm
                            : null,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
