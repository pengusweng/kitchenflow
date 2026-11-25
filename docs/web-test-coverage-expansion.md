# Web app test coverage expansion

Reviewed and extended on 2026-11-25. Scope is the Next.js Web app under `web/`
only. The POS/mobile app, backend tests, and Robot API E2E were not changed.

## What was added

| Layer | New coverage | Files |
| --- | --- | --- |
| Unit (WU) | `ApiError.fromResponse` code/message/Retry-After mapping and network fallback; `pageItems` gap and end-of-range behavior; `nextSort` asc/desc/default cycling; order summary/detail mapping, modifier-inclusive money arithmetic, and timeline ordering; exact dashboard group order, hrefs, and hidden links for unknown roles | `src/lib/api-error.test.ts`, `src/lib/pagination.test.ts`, `src/lib/table-sort.test.ts`, `src/features/orders/utils/orders.test.ts`, `src/features/dashboard/utils/navItems.test.ts` |
| Integration (WI) | Login route validation, 503/502 normalization, upstream 401 mapping, PIN code forwarding, session-cookie attributes, and `no-store`; logout route bearer revocation, best-effort failure handling, and cookie deletion; proxy origin rejection and cookie-to-bearer rewriting; login-card client validation, request body, and success callback | `src/app/api/auth/login/route.integration.test.ts`, `src/app/api/auth/logout/route.integration.test.ts`, `src/proxy.integration.test.ts`, `src/features/auth/components/login-card.test.tsx` |
| Browser E2E/smoke (WE) | Local credential validation with zero login requests; supervisor dashboard link visibility; signed-in redirect away from `/login` except `?switchAccount=1`; stale-cookie sign-out; session-cookie attributes; all server-guarded management routes redirect when signed out | `tests/e2e/login.spec.ts`, `tests/e2e/session.spec.ts`, `tests/e2e/helpers.ts` |

Existing tests were kept. The new browser cases use the committed local auth
fixture (`web/tests/fixtures/auth-api.mjs`), so they need no PostgreSQL or NestJS
API.

## Results from this checkout

| Command | Result |
| --- | --- |
| `npm run test` | **22 files, 146 tests passed** (up from 17 files / 116 tests; 30 new Vitest cases) |
| `npm run test:e2e` | **11 passed** across Chromium (up from 5; 6 new cases) |
| `npm run test:smoke` | **4 passed** (`--grep @smoke`; 2 new smoke tags) |
| `npm run lint` | Clean |
| `npm run typecheck` | Clean |
| `npm run build` | Passed after clearing stale generated `.next` types |

The Playwright production build was regenerated before the browser run. Reports
are written to `web/reports/vitest.xml`, `web/reports/vitest/`,
`web/reports/playwright.xml`, and `web/playwright-report/`.

## Evidence boundaries

- The E2E cases use the fixture's single `SUPERVISOR` user. They do not cover a
  real API, PostgreSQL, superadmin PIN sign-in, or role-gated data on Orders,
  Menu, Kitchen Overview, Recipes, or Audit History.
- Route-handler tests use MSW for the upstream API and a mocked `next/headers`
  cookie store for logout. They prove handler logic, not Next.js routing or
  browser cookie enforcement; the browser session cases cover the latter.
- Proxy tests inspect Next.js's internal `x-middleware-request-*` headers. They
  verify the rewrite contract, not an end-to-end proxied API call.
- No accessibility, visual-regression, performance, or mobile/POS behavior is
  claimed by these tests.

## Running locally

From `web/`:

```powershell
npm install          # only if node_modules is stale; package.json already lists @vitest/ui
npm run test
npm run lint
npm run typecheck
npm run build        # required before Playwright because the config uses next start
npm run test:smoke
npm run test:e2e
```

If `next build` fails in `.next/dev/types/validator.ts` after switching branches,
delete the generated `web/.next` directory and build again. A stale validator
referenced a route that no longer exists in this checkout.

## Next useful additions

1. Extend the auth fixture with a superadmin and PIN challenge states, then add
   browser tests for successful and locked PIN sign-in.
2. Add fixture routes for Orders, Menu, Kitchen Overview, Audit History, and
   Staff so browser tests can exercise filters, detail modals, availability
   rollback, and role-restricted content without a live backend.
3. Keep the full-stack browser suite separate until CI provisions an API and
   database; the current Web CI job intentionally runs against the local fixture.
