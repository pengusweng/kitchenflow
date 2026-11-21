import 'package:flutter/material.dart';
import 'package:mobile/app/theme/tokens.dart';
import 'package:mobile/app/theme/typography.dart';

class KitchenBoardErrorBanner extends StatelessWidget {
  const KitchenBoardErrorBanner({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const ValueKey('kitchen-board-error-banner'),
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: KkfcSpace.s20,
        vertical: KkfcSpace.s8,
      ),
      decoration: const BoxDecoration(
        color: KkfcColors.dangerBg,
        border: Border(
          bottom: BorderSide(
            color: KkfcColors.dangerBorder,
            width: KkfcBorderWidth.thin,
          ),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 18,
            color: KkfcColors.danger,
          ),
          const SizedBox(width: KkfcSpace.s8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textSm,
                fontWeight: KkfcFontWeights.medium,
                color: KkfcColors.danger,
              ),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              foregroundColor: KkfcColors.danger,
              padding: const EdgeInsets.symmetric(
                horizontal: KkfcSpace.s8,
                vertical: KkfcSpace.s4,
              ),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text(
              'Retry',
              style: TextStyle(
                fontFamily: KkfcFonts.ibmPlexSans,
                fontSize: KkfcTextSizes.textSm,
                fontWeight: KkfcFontWeights.bold,
                color: KkfcColors.danger,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
