import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/repository/auth_repository.dart';
import 'package:mobile/features/auth/providers/session_provider.dart';
import 'package:mobile/features/new_order/providers/menu_providers.dart';
import 'package:mobile/shared/widgets/button/button.dart';

/// Themed logout button extracted from [AppHeader].
///
/// Handles ending the server session and resetting active order / cart state.
class LogoutButton extends ConsumerWidget {
  const LogoutButton({
    super.key,
    this.color,
    this.tooltip = 'Logout',
    this.onLoggedOut,
    this.constraints,
    this.padding,
    this.iconSize,
    this.compact,
  });

  /// Icon color. Defaults to [ColorScheme.onInverseSurface] when null.
  final Color? color;

  /// Tooltip description for accessibility and testing.
  final String tooltip;

  /// Optional callback invoked immediately after sign-out state is dispatched.
  final VoidCallback? onLoggedOut;

  /// Optional constraints for the [IconButton].
  final BoxConstraints? constraints;

  /// Optional padding for the [IconButton].
  final EdgeInsetsGeometry? padding;

  /// Optional icon size for the [IconButton].
  final double? iconSize;

  /// Whether to render in a compact layout (e.g. on mobile/phone screens).
  ///
  /// Defaults to detecting automatically when screen width < 600px.
  final bool? compact;

  /// Signs out the current session and clears all order, cart, and search state.
  static void signOut(WidgetRef ref) {
    final token = ref.read(sessionTokenProvider);
    if (token != null) {
      unawaited(ref.read(authRepositoryProvider).logout(token));
    }
    ref.read(cartProvider.notifier).clear();
    ref.read(orderReferenceProvider.notifier).clear();
    ref.read(storeReferenceProvider.notifier).clear();
    ref.read(menuSearchProvider.notifier).clear();
    ref.read(menuChannelProvider.notifier).reset();
    ref.read(sessionExpiredProvider.notifier).set(false);
    ref.read(sessionTokenProvider.notifier).setToken(null);
  }

  /// Displays a confirmation dialog asking if the user wants to log out.
  /// Returns `true` if the user confirmed, `false` otherwise.
  static Future<bool> showConfirmationDialog(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Do you want to logout?'),
        content: const Text('Any active order draft will be cleared.'),
        actions: [
          KkfcOutlinedButton(
            label: 'Cancel',
            size: KkfcButtonSize.compact,
            onPressed: () => Navigator.of(ctx).pop(false),
          ),
          KkfcPrimaryButton(
            label: 'Logout',
            size: KkfcButtonSize.compact,
            customBackground: const Color(0xFFB3261E),
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  Future<void> _handlePressed(BuildContext context, WidgetRef ref) async {
    final confirmed = await showConfirmationDialog(context);
    if (confirmed && context.mounted) {
      signOut(ref);
      onLoggedOut?.call();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final effectiveColor =
        color ?? Theme.of(context).colorScheme.onInverseSurface;
    final isCompact = compact ?? (MediaQuery.sizeOf(context).width < 600);

    final effectiveConstraints = constraints ??
        (isCompact
            ? const BoxConstraints(minWidth: 32.0, minHeight: 32.0)
            : null);
    final effectivePadding = padding ?? (isCompact ? EdgeInsets.zero : null);
    final effectiveIconSize = iconSize ?? (isCompact ? 18.0 : null);

    return IconButton(
      tooltip: tooltip,
      constraints: effectiveConstraints,
      padding: effectivePadding,
      iconSize: effectiveIconSize,
      visualDensity: isCompact ? VisualDensity.compact : null,
      style: isCompact
          ? IconButton.styleFrom(
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              padding: effectivePadding ?? EdgeInsets.zero,
              minimumSize: const Size(32.0, 32.0),
            )
          : null,
      icon: Icon(Icons.logout, color: effectiveColor, size: effectiveIconSize),
      onPressed: () => _handlePressed(context, ref),
    );
  }
}

/// Alias for [LogoutButton].
typedef ThemedLogoutButton = LogoutButton;
