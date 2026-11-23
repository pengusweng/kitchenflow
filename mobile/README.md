# KKFC Mobile

Flutter mobile app for the KKFC multi-brand POS system. The app has a light theme for counter screens and a dark theme for the kitchen display.

## Prerequisites

- **Flutter SDK** (stable channel)
- **Android Studio** with the Android SDK, platform tools, emulator, and **NDK 28.2.13676358** (pinned; do not use another version)
- **Google Chrome** for web development
- Keep the Android SDK in a path with no spaces, such as `C:\Android\Sdk`.
- Windows desktop is not a target. Disable it with `flutter config --no-enable-windows-desktop`.

Check your setup with `flutter doctor`.

## Running the app

For APKs built automatically on GitHub, optional in-app updates, or running
against the hosted API without a local backend, see [UPDATES.md](UPDATES.md).

```sh
flutter pub get
```

The API base URL comes from the `API_URL` define. The default is `http://localhost:3000/api` (the NestJS global prefix, see the root README).

**Chrome:**

```sh
flutter run -d chrome --dart-define-from-file=env/dev-chrome.json
```

**Android emulator** (the emulator reaches the host through `10.0.2.2`):

```sh
flutter run -d emulator-5554 --dart-define-from-file=env/dev-emulator.json
```

Use `r` for hot reload, `R` for a full restart (needed after changes to themes, fonts, or app-level code), and `q` to quit.

## Checks before opening a pull request

```sh
flutter analyze
flutter test
```

Both must pass. After changing a model or enum with `freezed` or `json_serializable`, regenerate and commit the output:

```sh
dart run build_runner build --delete-conflicting-outputs
```

### Unit, widget, and golden test reports

Run from `mobile/`:

```powershell
dart run tool/run_flutter_tests.dart --coverage
```

This runs `test/` (including golden tests) and writes a new folder under
`reports/flutter/<timestamp>/` containing `report.html`, `test-results.feature`,
`results.json`, and `run.log`. The HTML groups counts by test type and includes
test durations, failure details, blockers, and Given/When/Then scenarios. Each
executed test, including parameter variants, gets its own scenario and result.
Descriptions are generated from the test names and fixtures; existing
Given/When/Then wording in names is preserved. Results apply to complete tests,
not independently executed Gherkin steps.

Use this runner whenever you want saved reports; plain `flutter test` still
prints results only. Additional Flutter test options such as
`--exclude-tags golden` are forwarded. Golden tests use the existing local or CI
baselines; this runner never updates them automatically.

Flutter CI uses this command and uploads the `flutter-test-results` artifact
even when tests fail. Coverage remains in `flutter-coverage-report`; golden
failure comparison images are uploaded as `flutter-golden-failures` when present.
Download and extract the results artifact, then open its `report.html` file.
These checks and the debug APK build run in Stage 1 of Flutter CI.

### Flutter-to-API tests in GitHub Actions

The repository's CI workflow calls Flutter CI for Flutter changes. Each stage
starts after the previous stage passes:

1. **Unit, Widget & Golden Tests and Build** runs formatting, analysis, the
   Flutter test suite, and the Android debug build.
2. **Flutter-to-API Integration Tests** runs `--suite=auth` and `--suite=pos` on
   Android and uploads `flutter-api-integration-results`.
3. **Order and Kitchen E2E Tests** runs `--suite=orders` on Android and uploads
   `flutter-api-order-results`.

Each device stage starts a fresh PostgreSQL service, applies Prisma migrations,
and generates its test accounts before starting the real API on port `3001`.
The Android emulator reaches it at `http://10.0.2.2:3001/api`. The device stages
upload the HTML, JSON, Gherkin, raw test output, and API log on success or failure.

Once the workflow is on the default branch, it can also be started from
**Actions → Flutter CI → Run workflow**. Pick the branch you want to test.

### Real API login integration tests

`integration_test/auth_api_test.dart` runs the actual app on an Android emulator,
using the real login API and platform secure storage. It checks successful login,
the redirect to the menu, token persistence, acceptance of that token by
`GET /auth/me`, and rejection of a wrong password without a local session.
These tests cover authentication only; the separate POS suite covers the API menu and cart flow.

### Mobile POS core flow integration tests

`integration_test/pos_core_test.dart` is a separate device suite covering the real
API-backed flow from login through provider selection, channel selection, menu,
and cart. It checks adding and merging quantities, cart controls and clearing,
Dine-in to Takeaway repricing, search, and rejection of unavailable menu items.
The test selects its fixture brand from the real catalog and checks that
switching to Takeaway in Order details reprices the existing cart. The cart is
local draft state. The `orders` suite covers persisted orders. No providers or
HTTP responses are mocked.

Start the same isolated database and test API described below. Then, from
`server/`, prepare fixtures on that API's test database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://pos:mobile-test-only@localhost:5544/pos_mobile_test'
npx.cmd ts-node -P prisma/tsconfig.seed.json prisma/mobile-pos-fixtures.ts prepare
```

This creates a private test brand, cashier account, recipe, two menu items, and
Dine-in (100 pesos) / Takeaway (125 pesos) channel prices. It saves generated test
credentials and IDs in gitignored `mobile/.fixtures/pos-flow.json`. Preparation
requires a database with `test` in its name. Rerunning preparation reuses fixtures
that still exist in that database and regenerates them after the temporary
database is recreated.

With the API and emulator running, run from `mobile/`:

```powershell
dart run tool/run_integration_tests.dart --suite=pos -d emulator-5554
```

HTML, JSON, Gherkin, and raw logs are saved under `reports/integration/<timestamp>/`.
The Gherkin source is `features/mobile/pos-core.integration.feature`. The default
runner without a `--suite` option runs the authentication suite. Both run in
Stage 2 of Flutter CI.

For a USB-connected phone, configure `adb reverse tcp:3001 tcp:3001` and use:

```powershell
dart run tool/run_integration_tests.dart --suite=pos -d <device-id> --dart-define-from-file=.fixtures/pos-flow.json --dart-define=API_URL=http://localhost:3001/api
```

Each test starts signed out and revokes its own session afterward. After testing,
run from `server/` with the same `TEST_DATABASE_URL`:

```powershell
npx.cmd ts-node -P prisma/tsconfig.seed.json prisma/mobile-pos-fixtures.ts cleanup
```

Cleanup deletes only this fixture's records and removes its generated file. Stop
the temporary database only after cleanup. Regenerate fixtures before rerunning
the suite if they were removed.

### Order review and API lifecycle integration tests

The `--suite=orders` suite combines the current mobile flow with API contract
checks. Review order creates the draft from Order details. Confirm and send
confirms it and displays the API-issued ticket number.

The suite covers:

- Login, provider selection, cart, Order details, review, and repeated-send
  suppression in the UI. A separate API verification check exercises `/verify`.
- Real API create retries, conflicting UUID payloads, brand-prefixed daily order
  codes, platform duplicate prevention, and idempotent confirmation/ticket creation.
- Availability changes through an isolated fixture manager: the API rejects a
  stale draft at verification/confirmation, and the UI preserves a rejected cart.
  Stock quantity reservation/posting is outside the backend's current scope.
- One persisted Takeaway order continues from the cashier UI into a kitchen-head
  login, acknowledgement, preparation, QC rejection/rework, approval, and handover.
  The test checks the saved order and ticket at each transition, two distinct QC
  attempts, removal from the active board, and navigation to the live availability
  catalog and back. The first QC check and rejection use the production
  repository to test external SSE updates. The remaining kitchen actions use
  the UI. No responses or providers are mocked.

Start the shared test API below, then prepare separate order fixtures from
`server/` (these do not overwrite the earlier POS fixture):

```powershell
$env:TEST_DATABASE_URL = 'postgresql://pos:mobile-test-only@localhost:5544/pos_mobile_test'
npx.cmd ts-node -P prisma/tsconfig.seed.json prisma/mobile-pos-fixtures.ts prepare --orders
```

Run from `mobile/`:

```powershell
dart run tool/run_integration_tests.dart --suite=orders -d emulator-5554
```

The gitignored `.fixtures/order-flow.json` contains the dedicated brand, cashier,
supervisor, and kitchen-head accounts and menu IDs. Rerun `prepare --orders` to
add the kitchen account to older fixtures or regenerate a stale manifest. The
suite creates real test orders and
tickets. References/UUIDs are unique per run and tests restore changed availability.
Run cleanup from `server/` with the same `TEST_DATABASE_URL` when finished:

```powershell
npx.cmd ts-node -P prisma/tsconfig.seed.json prisma/mobile-pos-fixtures.ts cleanup --orders
```

Cleanup removes this fixture's orders, tickets, daily counters, catalog, accounts,
QC attempts, rejected portions, handoffs, and sessions only. Reports include HTML, Gherkin, JSON, and raw logs under
`reports/integration/`. This suite runs in Stage 3 of Flutter CI.

To run only the connected kitchen flow, append `--plain-name=IT-MOB-ORD-005`.
It uses Takeaway so camera access and S3 are unnecessary. Delivery upload coverage
still belongs to the separate backend storage/E2E checks. The mobile orders list
is a placeholder, so this flow verifies completed orders through the API.

### Shared test API setup

Start the isolated, temporary PostgreSQL database from the repository root:

```powershell
docker compose -p kkfc-mobile-test -f docker-compose.mobile-test.yml up -d --wait
```

In a backend terminal, prepare the schema and seeded test accounts, then keep
the API running on port 3001. Run these commands from `server/` (after `npm ci`
on a fresh checkout):

```powershell
$env:DATABASE_URL = 'postgresql://pos:mobile-test-only@localhost:5544/pos_mobile_test'
$env:NODE_ENV = 'test'
$env:PORT = '3001'
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npx.cmd ts-node -P prisma/tsconfig.seed.json prisma/seed-test.ts
npm.cmd run start
```

Use this dedicated database for the test API. The standalone Compose file does
not use the development database or its volumes; its data disappears when the
container stops. No AWS credentials are needed for these authentication tests.

In another terminal, run from `mobile/`:

```powershell
flutter pub get
flutter emulators
flutter emulators --launch <emulator-id>
flutter devices
flutter test integration_test/auth_api_test.dart -d <device-id> --dart-define-from-file=env/test-emulator.json
```

The default test account is `test_order_staff` / `Password123!`, from
`server/prisma/seed-test.ts`. Override it with `--dart-define=TEST_USERNAME=...`
and `--dart-define=TEST_PASSWORD=...` if using other dedicated test fixtures.
`ENV=test` and an explicit `API_URL` are required. For a physical device, replace
the emulator URL with an address that reaches the test backend.

#### Save a test report

With the API and device ready, run this from `mobile/` instead of the plain
`flutter test` command:

```powershell
dart run tool/run_integration_tests.dart -d emulator-5554
```

Replace the device ID as needed. Each run creates a timestamped folder under
`mobile/reports/integration/` with:

- `report.html`: open in a browser to see the summary, individual test results,
  durations, failure details and stack traces, and run blockers.
- `results.json`: structured results for automation.
- `auth-api.integration.feature`: Given/When/Then scenarios with their observed
  results in Gherkin comments.
- `run.log`: full Flutter output, including build and device diagnostics.

The terminal prints the report path. Reports are generated even if Flutter cannot
start or no device is specified, and previous reports are retained. Failed runs
return a nonzero exit code. Generated reports are gitignored.

The HTML report also displays the Given/When/Then scenarios from
`features/mobile/auth-api.integration.feature`, matched to Flutter tests by their
`@IT-MOB-AUTH-*` tags. Scenarios that did not execute are marked **Not run**.
Results apply to the whole scenario; individual steps are descriptive and do not
have separately measured pass/fail statuses. Flutter remains the test executor.

Additional Flutter test options are forwarded. `--dart-define` overrides a
single value from the suite defaults. An explicit `--dart-define-from-file`
selects a different file. For example, after configuring
`adb reverse tcp:3001 tcp:3001` for a USB-connected phone:

```powershell
dart run tool/run_integration_tests.dart -d <device-id> --dart-define=ENV=test --dart-define=API_URL=http://localhost:3001/api
```

Setup/build/device problems that prevent a completed run are reported as blockers;
individual test failures remain failures to investigate. A failure does not
automatically prove an application bug. Check the details and raw log to establish
the cause. An abruptly terminated report runner (for example Ctrl+C or power loss)
may leave only a partial log; rerun it to generate a complete report.

The tests clear the app's saved token before each case and revoke sessions they
create afterward, including when assertions fail. Use a test emulator or app
installation. HTTP failures or an unavailable backend fail the tests; responses
are never mocked. Waits for API results are bounded to 45 seconds.

After testing, stop the API with Ctrl+C, close its terminal (to discard its
test environment variables), and stop the temporary database from the root:

```powershell
docker compose -p kkfc-mobile-test -f docker-compose.mobile-test.yml down
```

See the [Flutter integration test guide](https://docs.flutter.dev/testing/integration-tests)
for the SDK runner used here.

### Golden tests

Golden tests use [Alchemist](https://pub.dev/packages/alchemist). CI compares the committed Linux baselines in `test/**/goldens/ci/`. Locally, tests compare gitignored platform baselines in `test/**/goldens/<platform>/`, which show real font rendering and are useful for inspection. The two variants never run in the same environment.

Generate or update the CI baselines on Ubuntu 24.04 with the same Flutter version as CI:

```sh
CI=true flutter test --update-goldens
CI=true flutter test
```

Generate local platform baselines without `CI=true`:

```sh
flutter test --update-goldens
```

Commit only `test/**/goldens/ci/*.png`. Never pass `--update-goldens` in CI, and do not generate CI baselines on Windows or macOS.

## Project folders and files

| Path | Purpose |
| --- | --- |
| `lib/` | Application Dart code. See the breakdown below. |
| `test/` | Automated tests. Mirror the `lib/` path when adding a test. |
| `assets/fonts/` | Bundled font files and their OFL license files. Declared in `pubspec.yaml`. |
| `android/` | Android host project: build settings, permissions, and native integrations. |
| `ios/` | iOS host project: build settings, permissions, and native integrations. |
| `pubspec.yaml` | Package metadata, dependencies, and asset and font declarations. |
| `pubspec.lock` | Resolved dependency versions. Commit it for reproducible builds. |
| `analysis_options.yaml` | Analyzer and lint configuration. |
| `.metadata` | Flutter tooling metadata. Managed by Flutter. |
| `.dart_tool/`, `build/` | Generated output. Do not edit. |
| `.idea/`, `mobile.iml` | IDE configuration. |

## How `lib/` is organized

```text
lib/
  main.dart              Startup: system UI mode, ProviderScope, runApp
  app/                   Application shell: root widget, routing, theming
    app.dart             Root MaterialApp.router with counter and kitchen themes
    router.dart          Routes and the login redirect (routerProvider)
    routes.dart          Route path constants
    theme/               Design tokens and theme system
      tokens.dart           Spacing, radius, sizing, motion, and opacity values
      color_schemes.dart    Generated ColorSchemes (counter and kitchen)
      semantic_colors.dart  KkfcSemanticColors and KkfcTone (feedback, text, borders, age)
      status_colors.dart    KkfcStatusColors (order status tones)
      brand_colors.dart     KkfcBrand enum, brand accents, and themeForBrand
      typography.dart       Font families and the type scale
      status_icons.dart     Icon for each order status
      ticket_age.dart       TicketAgeLevel (normal, caution, overdue)
      theme_context.dart    context.semanticColors, context.statusColors, context.brandColors
      theme.dart            counterTheme and kitchenTheme
  core/                  Non-UI shared code
    config/              Compile-time config: API_URL and ENV via --dart-define
    models/              Shared domain types: OrderStatus
  features/              Feature modules (providers/ state + screens/ UI)
    auth/                Session provider and login screen (temporary)
    orders/              POS orders UI (scaffolding only)
  shared/                Reusable cross-feature widgets
    widgets/             KkfcScaffold and PlaceholderScreen
```
