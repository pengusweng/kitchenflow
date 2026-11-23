# Mobile and backend test coverage review

Reviewed on 2026-11-23. Scope: Flutter unit/provider/repository, widget, golden,
device integration, backend unit and HTTP/PostgreSQL integration, migrations,
Robot/API E2E, test reporting, and CI configuration.

## Existing coverage and additions

| Layer | Existing coverage | Addition in this change |
| --- | --- | --- |
| Flutter unit/provider/repository | Authentication/session, cart/draft/repricing/search, API mappings/interceptors, availability, kitchen state and repository requests | Fragmented CRLF SSE events retain identity across checking/rework/ready, including a final event without a delimiter; an already-cancelled subscription sends no request and does not fall back to REST |
| Flutter widget | Menu/cart/review, cancellation, protected routes, role restrictions, kitchen acknowledgement/preparation/QC/rework/handover, availability, shared controls | Existing individual kitchen interaction tests retained; the connected device scenario now chains those screens against the same persisted order |
| Flutter golden | Status badges, loading button, kitchen ticket statuses/age/read-only/loading/long content at three widths and two text scales | Kitchen **board** card rework/rejection details and disabled QC action at 720dp, 1x and 2x text; two new CI baselines |
| Flutter real API integration | Login/token persistence, POS menu/channel/cart, draft creation, verify/confirm, idempotency, platform duplication, and stale availability | `IT-MOB-ORD-005`: cashier entry, UI review and confirmation with the API-issued ticket, logout, kitchen-head login, acknowledgement, preparation, QC, external rejection observed through the live stream, UI return from rework, item approval, handover checklist, completion/removal, availability catalog and return |
| Backend unit | Domain rules, repositories, permissions, fulfillment orchestration, audit/storage, catalog/recipes/users | `UT-KFUL-009`: five fulfillment operations propagate a commit failure without publishing a kitchen board update |
| Backend HTTP/database integration | DTOs/guards/roles, transactional persistence/idempotency/concurrency, snapshots, numbering, full kitchen lifecycle and cancellation, audit, migrations | `IT-KFUL-023`: inject a failure **after a real transactional write** during preparation, check, pass, reject, and handover; verify unchanged order/ticket/QC/rejection records and a successful retry |
| Backend E2E | Robot authentication/brands/users/catalog/orders and kitchen assignment/authorization tests; standalone orders/kitchen shell flow with QC rework and delivery evidence | Reviewed; no new runner or duplicate E2E framework introduced |
| Reporting/CI | Jest scenario traceability/reporters; Flutter report parser/runner tests; backend unit/integration/Robot jobs; Flutter analysis/tests/goldens/build | Added matching Gherkin scenarios and explicit mixed UI/API limitations in the mobile report |

## What the connected mobile scenario proves

The same API-issued order ID, order code, kitchen ticket ID, and ticket number
are checked across the flow. The test checks persisted order/ticket status after
each kitchen transition, two QC attempts with failed/passed outcomes, required
item approval and outgoing checklist gates, final completion, removal from the
active board, and the real availability catalog. It uses production providers,
Dio transport, repositories, authentication, and the running API.

The app creates a `DRAFT` when the cashier taps Review order, then confirms it
and displays the real ticket number when the cashier taps Confirm and send.
`IT-MOB-ORD-001` exercises `/verify` separately. The first QC check and rejection
use the production repository directly to exercise a change
arriving over SSE. The other kitchen mutations use screen controls. Takeaway
avoids requiring camera or S3 access. The fixture now provides a kitchen head;
cleanup removes QC rejections, attempts, and handoffs before their parent tickets.

## Validation

- After regenerating the stale local Prisma client, the full backend baseline
  passed: **29 unit suites / 876 tests**, **39 integration suites / 1,388 tests**.
- The changed backend suites passed with the additions: **16 fulfillment unit
  tests** and **135 orders/database integration tests**, including all ten new
  parameter cases. These are targeted reruns after the full baseline.
- Reporter tests: **14 passed**; scenario traceability passes.
- The initial full Flutter run: **424 passed, 5 failed**. All failures are existing
  CI kitchen-card golden comparisons: on-time/due-soon/late/variants at 360dp 2x,
  and variants at 720dp 2x. The failures reproduce in the focused kitchen run.
  Existing baselines were not regenerated. Inspection shows text/layout geometry
  differences; the test artifacts require investigation before accepting updates.
- The two new board golden cases were generated, visually inspected, and checked
  against their own baselines. New networking cases are also covered by the
  focused kitchen run.
- The final focused kitchen unit/widget run passed **49 tests**. The complete
  mobile suite excluding goldens passed **347 tests**. An existing SSE test
  intermittently failed because it allowed only 20 ms for asynchronous delivery;
  it now waits for actual stream events with a timeout. The scenario reporter
  test now validates all five order scenarios and maps the new kitchen result.
- Full Flutter static analysis passed. The real integration test APK built.
- Robot and storage-dependent shell E2E scripts were reviewed, not executed as
  part of this validation.
- A standalone live API smoke exercised cashier creation/confirmation, kitchen
  acknowledgement/preparation, QC rejection/rework/approval, and handover. A
  follow-up read verified the completed order, same handed-over ticket, and
  failed/passed QC history. `/kitchen-ticket/today` includes terminal tickets;
  the Flutter parser filters these from the active board.
- After refreshing the stale fixtures and updating the drivers for the current
  ordering screens, all ten real API cases passed on Android `emulator-5554`
  across login (2), POS (3), and orders (5), including `IT-MOB-ORD-005`.

## Remaining gaps, in priority order

1. **Cover confirmation recovery.** Add a mobile test for retrying confirmation
   after losing the success response.
2. **Investigate the five existing golden failures.** Review comparison images at
   large text, confirm intended layout/font behavior on the CI Flutter version,
   and update references only if the changes are intentional.
3. **Connect Orders to the backend list.** The mobile screen is a placeholder
   although the backend now has `GET /orders` coverage. Once connected, add order
   search/filter/status counts, open details, cancellation, and completed-order
   visibility through actual navigation.
4. **Device delivery evidence.** Add camera/gallery denial, upload failure/retry,
   photo limits, and successful GrabFood/Foodpanda handover against isolated
   storage. Existing widget/request serialization coverage does not establish a
   working device upload.
5. **Live updates and role changes.** Add two-device preparer/checker workflows,
   reconnect after losing connectivity, session expiry while a dialog is open,
   and verification that logout prevents old-session updates from reaching the
   next user's board. Fragmented-event and pre-cancel tests cover only part of
   this boundary.

Flutter CI now runs the login and POS suites in Stage 2 and the order and kitchen
suite in Stage 3. Each device stage provisions an Android emulator and a migrated
test database and uploads its reports and API log. See `mobile/README.md` for
the GitHub Actions entry point.

Run the connected flow with the setup in `mobile/README.md`:

```powershell
# From mobile/, after preparing fresh --orders fixtures and starting the test API:
dart run tool/run_integration_tests.dart --suite=orders -d emulator-5554 --plain-name=IT-MOB-ORD-005
```
