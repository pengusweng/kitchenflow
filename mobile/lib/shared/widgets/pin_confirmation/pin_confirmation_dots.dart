import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:mobile/app/theme/theme_context.dart';
import 'package:mobile/app/theme/tokens.dart';

/// Animated PIN code indicator dots with shake feedback on error.
class PinConfirmationDots extends StatelessWidget {
  const PinConfirmationDots({
    super.key,
    required this.length,
    required this.filledCount,
    required this.hasError,
    required this.shakeAnimation,
    this.isVerifying = false,
  });

  /// Total number of PIN digits (typically 4 or 6).
  final int length;

  /// How many digits have been entered so far.
  final int filledCount;

  /// Whether the entered PIN is invalid, triggering error coloring.
  final bool hasError;

  /// Shake animation driver for lateral error oscillation.
  final Animation<double> shakeAnimation;

  /// Whether the PIN is currently being verified asynchronously.
  final bool isVerifying;

  @override
  Widget build(BuildContext context) {
    final semantic = context.semanticColors;

    return AnimatedBuilder(
      animation: shakeAnimation,
      builder: (context, child) {
        // Sinusoidal lateral oscillation (double-shake)
        final offset = math.sin(shakeAnimation.value * math.pi * 4) * 10.0;
        return Transform.translate(
          offset: Offset(offset, 0),
          child: child,
        );
      },
      child: Semantics(
        label: '$filledCount of $length digits entered',
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(length, (index) {
            final isFilled = index < filledCount;
            final isActive = index == filledCount && !hasError && !isVerifying;

            Color dotColor;
            Color borderColor;

            if (hasError) {
              dotColor = semantic.danger.fg;
              borderColor = semantic.danger.border ?? semantic.danger.fg;
            } else if (isFilled) {
              dotColor = semantic.action;
              borderColor = semantic.action;
            } else if (isActive) {
              dotColor = Colors.transparent;
              borderColor = semantic.borderFocus;
            } else {
              dotColor = Colors.transparent;
              borderColor = semantic.borderDefault;
            }

            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: KkfcSpace.s8),
              child: AnimatedContainer(
                duration: KkfcMotion.durMicro,
                curve: KkfcMotion.easeOut,
                width: 20.0,
                height: 20.0,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: dotColor,
                  border: Border.all(
                    color: borderColor,
                    width: isActive ? KkfcBorderWidth.focus : KkfcBorderWidth.thick,
                  ),
                  boxShadow: isActive
                      ? [
                          BoxShadow(
                            color: semantic.borderFocus.withValues(alpha: 0.25),
                            blurRadius: 4.0,
                            spreadRadius: 1.0,
                          ),
                        ]
                      : null,
                ),
                child: isFilled
                    ? Center(
                        child: AnimatedScale(
                          scale: isFilled ? 1.0 : 0.0,
                          duration: KkfcMotion.durMicro,
                          curve: KkfcMotion.easeSpring,
                          child: Container(
                            width: 10.0,
                            height: 10.0,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      )
                    : null,
              ),
            );
          }),
        ),
      ),
    );
  }
}
