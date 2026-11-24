# Web testing handoff

Run commands from `web/` with Node.js 22.12 or newer (Node 22 is used in CI).
On Windows PowerShell, use `npm.cmd` / `npx.cmd` if script execution is disabled.

## First run

```sh
npm ci
npx playwright install chromium
```

For the browser suites, build with `API_URL=http://127.0.0.1:3101` so the build's
API rewrites point to the test fixture. In PowerShell, run
`$env:API_URL = 'http://127.0.0.1:3101'` before `npm.cmd run build`. In a POSIX
shell, run `API_URL=http://127.0.0.1:3101 npm run build`.
The test suites run without NestJS or a database.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run all Vitest unit and integration tests once |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run component/server integration tests only |
| `npm run test:report` | Serve the last Vitest HTML report locally |
| `npm run test:watch` | Watch Vitest tests during development |
| `npm run test:coverage` | Run Vitest with text, HTML and LCOV coverage |
| `npm run lint` | Check app, test and config source |
| `npm run typecheck` | Generate Next.js route types and check TypeScript |
| `npm run build` | Build the production app before browser tests |
| `npm run test:smoke` | Run the quick Chromium checks tagged `@smoke` |
| `npm run test:e2e` | Run Chromium tests against the production app |
| `npm run test:e2e:ui` | Open Playwright's interactive test runner |
| `npm run test:e2e:report` | Open the last Playwright HTML report |

Playwright starts the test API on port 3101 and the production Next.js app on
port 3001. Both ports must be free. Set `PLAYWRIGHT_CHANNEL=chrome` to use an
installed Google Chrome when bundled Chromium is unavailable.

Smoke covers the home redirect, password visibility and signed-out route
access. The full suite adds invalid credentials, session restoration after a
reload, sign-out and supervisor access to Staff Accounts. The fixture at
`tests/fixtures/auth-api.mjs` supplies the upstream auth responses.

## Adding tests

- **Unit:** put `*.test.ts` alongside source. The starter
  `src/features/brands/schemas/brandFormSchema.test.ts` tests form validation.
- **Component integration:** put `*.test.tsx` alongside source. The starter
  `src/features/auth/components/login-card.test.tsx` exercises the real form,
  hook, React Query and API service with MSW auth and PIN responses.
- **Server integration:** use `*.integration.test.ts` with
  `// @vitest-environment node` at the top for route-handler/proxy tests.
  Direct handler tests do not prove Next.js routing or cookie behavior in a browser.
- **Browser:** put `*.spec.ts` under `tests/e2e/`. Copy a short case from
  `login.spec.ts` or `session.spec.ts`. Add `{ tag: "@smoke" }` to essential
  checks that should also run with `npm run test:smoke`.

Vitest's shared setup starts MSW, rejects unhandled network requests, resets
handlers and cleans up rendered components after every test. Use
`server.use(http.get/post(...))` for test-specific responses; put reusable handlers
in `tests/mocks/server.ts`. Create a fresh QueryClient per component test.
Keep assertions about observable behavior and use labels/roles for UI queries.

Async Server Components and actual Next.js redirects should be tested through
Playwright. Browser `page.route()` mocks cannot intercept server-side fetches.
For those cases, run a controlled upstream API server or the real NestJS API.

## Reports and CI

Each command-line run writes an HTML report. From `web/`, use
`npm run test:report` or `npm run test:e2e:report` and visit the printed URL.
If you download the CI artifact, keep each report directory intact.

| Suite | HTML report |
| --- | --- |
| Vitest including unit, integration and coverage runs | `reports/vitest/index.html` |
| Vitest coverage | `coverage/index.html` |
| Playwright smoke or full suite | `playwright-report/index.html` |

Each runner replaces its previous report. Copy the report directory to keep a
run for comparison. Use the command-line suites to generate reports for handoff.

`.github/workflows/web-ci.yml` runs lint, Vitest with coverage, production build,
type checking and the full Chromium suite. The required CI workflow selects it for
`web/**` and web workflow changes and includes its result in the final `CI` check.
The workflow can also be run manually from GitHub Actions.
Web failures participate in the existing automatic issue reporter. Optionally set
the repository Actions variable `CI_WEB_ASSIGNEES` to QA usernames; existing
default-owner and author fallback rules apply when it is unset.

The `web-test-results` artifact contains JUnit results (`reports/`), coverage
(`coverage/`), Playwright HTML (`playwright-report/`) and failure screenshots and
traces (`test-results/`). These generated files are ignored by Git.
Coverage is informational initially; there is no arbitrary percentage gate.

## Next work for QA

Expand validation/error cases, loading behavior and route access coverage first.
For full-stack browser tests, add an isolated PostgreSQL service, apply Prisma
migrations, prepare deterministic role-specific users, and start NestJS on the
configured `API_URL` before Playwright. The backend CI and
`server/prisma/e2e-fixtures.ts` show the existing fixture lifecycle; review them
before reuse. Keep test accounts/data isolated and clean up after execution.

The browser suite covers the web layer with a fixture API. Use the existing
backend suites for NestJS authentication, authorization and database persistence.
