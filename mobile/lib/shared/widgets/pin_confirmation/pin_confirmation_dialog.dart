import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/core/models/user_role.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';

import 'pin_confirmation_card.dart';

/// Modal dialog prompting the user for PIN confirmation.
///
/// Designed with POS touch ergonomics, hardware keyboard support,
/// and instant tactile / animation feedback.
class PinConfirmationDialog extends StatefulWidget {
  const PinConfirmationDialog({
    super.key,
    this.title = 'Superadmin Authorization',
    this.subtitle,
    this.pinLength = 4,
    this.expectedPin,
    this.onVerifyPin,
    this.actionLabel = 'Authorize',
    this.roleBadgeLabel = 'SUPERADMIN PRIVILEGE',
  });

  /// Dialog headline.
  final String title;

  /// Explanatory copy describing the privileged action being authorized.
  final String? subtitle;

  /// Number of required digits (defaults to 4).
  final int pinLength;

  /// Optional expected PIN for synchronous validation.
  final String? expectedPin;

  /// Optional async validation callback (e.g. against backend API).
  final Future<bool> Function(String pin)? onVerifyPin;

  /// Label for the confirmation button (defaults to 'Authorize').
  final String actionLabel;

  /// Label displayed inside the privileged role badge.
  final String roleBadgeLabel;

  @override
  State<PinConfirmationDialog> createState() => _PinConfirmationDialogState();
}

class _PinConfirmationDialogState extends State<PinConfirmationDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shakeController;
  late final Animation<double> _shakeAnimation;
  final FocusNode _focusNode = FocusNode();

  String _enteredPin = '';
  String? _errorMessage;
  bool _isVerifying = false;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
    _shakeAnimation = CurvedAnimation(
      parent: _shakeController,
      curve: Curves.easeInOut,
    );

    // Request keyboard focus for physical keyboards / barcode scanners
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNode.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _shakeController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onDigitPressed(String digit) {
    if (_isVerifying || _enteredPin.length >= widget.pinLength) return;

    setState(() {
      _errorMessage = null;
      _enteredPin += digit;
    });

    if (_enteredPin.length == widget.pinLength) {
      _verify();
    }
  }

  void _onBackspacePressed() {
    if (_isVerifying || _enteredPin.isEmpty) return;

    setState(() {
      _errorMessage = null;
      _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
    });
  }

  void _onClearPressed() {
    if (_isVerifying) return;

    setState(() {
      _errorMessage = null;
      _enteredPin = '';
    });
  }

  Future<void> _verify() async {
    if (_enteredPin.length != widget.pinLength || _isVerifying) return;

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    bool isValid = false;

    try {
      if (widget.onVerifyPin != null) {
        isValid = await widget.onVerifyPin!(_enteredPin);
      } else if (widget.expectedPin != null) {
        isValid = (_enteredPin == widget.expectedPin);
      } else {
        // If neither is provided, treat complete PIN as confirmed
        isValid = true;
      }
    } catch (_) {
      isValid = false;
    }

    if (!mounted) return;

    if (isValid) {
      Navigator.of(context).pop(true);
    } else {
      HapticFeedback.heavyImpact();
      _shakeController.forward(from: 0.0);
      setState(() {
        _isVerifying = false;
        _errorMessage = 'Incorrect PIN. Please try again.';
        _enteredPin = '';
      });
    }
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    // Numeric keys 0-9
    final char = event.character;
    if (char != null && RegExp(r'^[0-9]$').hasMatch(char)) {
      _onDigitPressed(char);
      return KeyEventResult.handled;
    }

    // Backspace
    if (event.logicalKey == LogicalKeyboardKey.backspace) {
      _onBackspacePressed();
      return KeyEventResult.handled;
    }

    // Escape -> Cancel
    if (event.logicalKey == LogicalKeyboardKey.escape && !_isVerifying) {
      Navigator.of(context).pop(false);
      return KeyEventResult.handled;
    }

    // Enter -> Submit if complete
    if (event.logicalKey == LogicalKeyboardKey.enter &&
        _enteredPin.length == widget.pinLength &&
        !_isVerifying) {
      _verify();
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_isVerifying,
      child: Focus(
        focusNode: _focusNode,
        autofocus: true,
        onKeyEvent: _handleKeyEvent,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: KkfcSpace.s20,
              vertical: KkfcSpace.s24,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400.0),
              child: SingleChildScrollView(
                child: PinConfirmationCard(
                  title: widget.title,
                  subtitle: widget.subtitle,
                  roleBadgeLabel: widget.roleBadgeLabel,
                  pinLength: widget.pinLength,
                  enteredPinLength: _enteredPin.length,
                  hasError: _errorMessage != null,
                  errorMessage: _errorMessage,
                  shakeAnimation: _shakeAnimation,
                  isVerifying: _isVerifying,
                  onDigitPressed: _onDigitPressed,
                  onBackspacePressed: _onBackspacePressed,
                  onClearPressed: _onClearPressed,
                  onCancel: () => Navigator.of(context).pop(false),
                  onConfirm: _verify,
                  actionLabel: widget.actionLabel,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Displays the PIN confirmation dialog.
Future<bool> showPinConfirmationDialog(
  BuildContext context, {
  String title = 'Superadmin Authorization',
  String? subtitle,
  int pinLength = 4,
  String? expectedPin,
  Future<bool> Function(String pin)? onVerifyPin,
  String actionLabel = 'Authorize',
  String roleBadgeLabel = 'SUPERADMIN PRIVILEGE',
  bool barrierDismissible = true,
}) async {
  final result = await showGeneralDialog<bool>(
    context: context,
    barrierDismissible: barrierDismissible,
    barrierLabel: 'Dismiss PIN dialog',
    barrierColor: KkfcElevation.shadowColor.withValues(alpha: KkfcOpacity.scrim),
    transitionDuration: KkfcMotion.durOverlay,
    pageBuilder: (context, animation, secondaryAnimation) =>
        PinConfirmationDialog(
          title: title,
          subtitle: subtitle,
          pinLength: pinLength,
          expectedPin: expectedPin,
          onVerifyPin: onVerifyPin,
          actionLabel: actionLabel,
          roleBadgeLabel: roleBadgeLabel,
        ),
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curvedAnimation = CurvedAnimation(
        parent: animation,
        curve: KkfcMotion.easeOut,
      );
      return FadeTransition(
        opacity: curvedAnimation,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.95, end: 1.0).animate(curvedAnimation),
          child: child,
        ),
      );
    },
  );

  return result ?? false;
}

/// Shows the PIN confirmation dialog IF AND ONLY IF the user's role is [UserRole.superadmin].
///
/// If [userRole] is not [UserRole.superadmin], this returns `false` without displaying
/// the dialog, effectively safeguarding superadmin-only operations.
Future<bool> showSuperadminPinConfirmationDialog(
  BuildContext context, {
  required UserRole? userRole,
  String title = 'Superadmin Authorization',
  String? subtitle,
  int pinLength = 4,
  String? expectedPin,
  Future<bool> Function(String pin)? onVerifyPin,
  String actionLabel = 'Authorize',
  String roleBadgeLabel = 'SUPERADMIN PRIVILEGE',
  bool barrierDismissible = true,
}) async {
  // Guard check: popup shows only when user role is SUPERADMIN
  if (userRole != UserRole.superadmin) {
    return false;
  }

  return showPinConfirmationDialog(
    context,
    title: title,
    subtitle: subtitle,
    pinLength: pinLength,
    expectedPin: expectedPin,
    onVerifyPin: onVerifyPin,
    actionLabel: actionLabel,
    roleBadgeLabel: roleBadgeLabel,
    barrierDismissible: barrierDismissible,
  );
}

/// Convenience guard helper that inspects [userRoleProvider] from Riverpod.
///
/// Prompts the PIN confirmation dialog popup only when the current logged-in role
/// is [UserRole.superadmin].
Future<bool> requireSuperadminPinConfirmation(
  BuildContext context, {
  required WidgetRef ref,
  String title = 'Superadmin Authorization',
  String? subtitle,
  int pinLength = 4,
  String? expectedPin,
  Future<bool> Function(String pin)? onVerifyPin,
  String actionLabel = 'Authorize',
  String roleBadgeLabel = 'SUPERADMIN PRIVILEGE',
  bool barrierDismissible = true,
}) async {
  final currentRole = ref.read(userRoleProvider);

  return showSuperadminPinConfirmationDialog(
    context,
    userRole: currentRole,
    title: title,
    subtitle: subtitle,
    pinLength: pinLength,
    expectedPin: expectedPin,
    onVerifyPin: onVerifyPin,
    actionLabel: actionLabel,
    roleBadgeLabel: roleBadgeLabel,
    barrierDismissible: barrierDismissible,
  );
}
