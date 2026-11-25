import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/fail_qc_send_to_rework_dialog.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_qc_dialog_body.dart';
import 'package:mobile/features/kitchen/kitchen_board/presentation/widgets/ticket_status_dialog/kitchen_ticket_qc_dialog_footer.dart';
import 'package:mobile/features/kitchen/kitchen_board/providers/kitchen_board_providers.dart';

/// Stateful coordinator for Quality Check modal workflow.
///
/// Enforces:
/// 1. "All items passed" CTA activates only when all items are explicitly passed.
/// 2. Clicking "Fail" on any item opens the [FailQcSendToReworkDialog] asking for
///    portion number and reason.
/// 3. "Fail QC and rework" button is disabled and muted when no failed items exist,
///    and enabled when at least 1 failed item is recorded.
/// 4. Clicking "Fail QC and rework" dispatches the array of [QcItemRejection] items.
class KitchenTicketQcView extends StatefulWidget {
  const KitchenTicketQcView({
    super.key,
    required this.ticket,
    required this.isActionLoading,
    required this.isActionEnabled,
    required this.onPass,
    this.onFail,
    this.onReject,
  });

  final KitchenBoardTicket ticket;
  final bool isActionLoading;
  final bool isActionEnabled;
  final VoidCallback? onPass;
  final VoidCallback? onFail;
  final Future<void> Function(List<QcItemRejection> rejections)? onReject;

  @override
  State<KitchenTicketQcView> createState() => _KitchenTicketQcViewState();
}

class _KitchenTicketQcViewState extends State<KitchenTicketQcView> {
  final Map<int, bool> _decisions = {};
  final Map<int, QcItemRejection> _rejections = {};
  List<KitchenQcAttempt> _fetchedAttempts = const [];
  bool _didRequestHistory = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didRequestHistory) {
      _didRequestHistory = true;
      _loadQcHistory();
    }
  }

  Future<void> _loadQcHistory() async {
    if (widget.ticket.pastQcAttempts.isNotEmpty) return;
    try {
      final container = ProviderScope.containerOf(context, listen: false);
      final attempts = await container
          .read(kitchenBoardProvider.notifier)
          .loadTicketQcAttempts(widget.ticket.kitchenTicketId);
      if (mounted && attempts.isNotEmpty) {
        setState(() {
          _fetchedAttempts = attempts;
        });
      }
    } catch (_) {
      // No ProviderScope in standalone widget test or fetch failed
    }
  }

  bool get _allPassed {
    final items = widget.ticket.data.items;
    if (items.isEmpty) return false;
    if (_decisions.length != items.length) return false;
    return _decisions.values.every((passed) => passed == true) &&
        _rejections.isEmpty;
  }

  bool get _hasFailedItem => _rejections.isNotEmpty;

  void _handleDecisionChanged(int index, bool passed) {
    if (passed) {
      setState(() {
        _decisions[index] = true;
        _rejections.remove(index);
      });
    } else {
      _handleFailItem(index);
    }
  }

  Future<void> _handleFailItem(int index) async {
    final items = widget.ticket.data.items;
    if (index < 0 || index >= items.length) return;
    final item = items[index];
    final existing = _rejections[index];

    final rejection = await showFailQcSendToReworkDialog(
      context,
      ticket: widget.ticket,
      item: item,
      initialPortionNumber: existing?.portionNumber,
      initialReason: existing?.reason,
    );

    if (rejection != null && mounted) {
      setState(() {
        _rejections[index] = rejection;
        _decisions[index] = false;
      });
    }
  }

  Future<void> _handleFailQcAndRework() async {
    if (_rejections.isEmpty) return;
    final rejectionsList = _rejections.values.toList();
    if (widget.onReject != null) {
      await widget.onReject!(rejectionsList);
    } else if (widget.onFail != null) {
      widget.onFail!();
    }
  }

  @override
  Widget build(BuildContext context) {
    final canPassAll = widget.isActionEnabled && _allPassed;
    final canFail = widget.isActionEnabled && _hasFailedItem;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Flexible(
          child: KitchenTicketQcDialogBody(
            ticket: _fetchedAttempts.isNotEmpty
                ? widget.ticket.applyQcAttempts(_fetchedAttempts)
                : widget.ticket,
            decisions: _decisions,
            rejections: _rejections,
            onDecisionChanged: _handleDecisionChanged,
            onFailItem: _handleFailItem,
          ),
        ),
        KitchenTicketQcDialogFooter(
          isActionLoading: widget.isActionLoading,
          isActionEnabled: canPassAll,
          isFailEnabled: canFail,
          onPass: canPassAll ? widget.onPass : null,
          onFail: canFail ? _handleFailQcAndRework : null,
        ),
      ],
    );
  }
}
