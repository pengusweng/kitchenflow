# Staging promotion and deployment

Promote reviewed code through `development` -> `staging` -> `main`.
All three branches use the same hosted API URL and database. These branches
represent promotion stages; they are not separate running environments. Render
serves the code from whichever branch its single service is configured to deploy.
The repository changes prepare CI and APK builds; GitHub settings, Render
settings, deployment, and hosted verification still need to be completed.
The existing remote `staging` branch should be merged into, not overwritten.

## Promote the preparation changes

1. Open a PR from `chore/preparation-for-staging` into `development` and merge after CI passes.
2. Open a PR with **base `staging`**, **compare `development`**. Resolve conflicts
   while preserving the workflow changes and reviewed database migrations.
3. Confirm the CI workflow runs on the staging PR and on its merged commit.
   Workflow files are versioned with the code and arrive through the same merge.
4. Under GitHub Settings -> Rules -> Rulesets (or branch protection), require
   pull requests and the final `CI` status check on `staging` and `main`.
   Keep the workflow free of top-level path filters so every PR gets that check.

Backend, Flutter, and web CI are reusable workflows selected by
`.github/workflows/required-ci.yml`. Its push and PR triggers cover all three
promotion branches. CI databases remain isolated PostgreSQL test containers.
GitHub settings and secrets are not stored in Git branches or copied by a merge.

## Configure GitHub Actions

Under Settings -> Secrets and variables -> Actions, configure repository variables:

| Variable | Staging value |
| --- | --- |
| `ANDROID_UPDATE_BRANCH` | `staging` (remove or replace an existing `development` override) |
| `ANDROID_API_URL` | Shared hosted API URL including `/api`; defaults to `https://kkfc-demo-api.onrender.com/api` |
| `STAGING_API_URL` | Same shared API origin without `/api`; defaults to `https://kkfc-demo-api.onrender.com` |

All APKs use the same API URL, including builds from `main`. Automatic update
checking and publishing default to staging only. No branch-specific API variables
are needed.
Repository variables affect subsequent runs, so rerun Android APK manually after
changing a URL; the push trigger otherwise only builds on mobile/workflow changes.

Retain the existing Android signing secrets (`ANDROID_KEYSTORE_BASE64`,
`ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Keep the
same signing key so installed tester APKs can update. See
[mobile/UPDATES.md](mobile/UPDATES.md) for installation and shared update-feed limits.

The keep-warm workflow must exist on the default branch (`main`), because GitHub
only runs scheduled workflows from that branch. If missing there, merge just
`.github/workflows/keep-api-warm.yml` into main as a separate infrastructure PR;
this does not require promoting the staging application. Keep its
`STAGING_API_URL` pointed at staging. It can also be run manually.

## Configure the Render staging API

Use the existing demo service and database. Switching the service's deployment
branch changes the backend for every client using the shared URL. Deploying
staging also applies its migrations to this shared database.

| Setting | Value |
| --- | --- |
| Repository | This GitHub repository |
| Branch | `staging` |
| Runtime | Docker |
| Root Directory | `server` |
| Dockerfile Path | `Dockerfile.render` |
| Docker Build Context | `.` (relative to `server`) |
| Docker Command | `npm run start:deploy` for routine staging deployments |
| Auto-Deploy | After CI Checks Pass |

`Dockerfile.render` contains the Prisma CLI and migrations. `start:deploy` applies
committed migrations and starts the API, without seeding on every restart.
Keep `DATABASE_URL` pointed at the existing shared PostgreSQL database and retain the
service's existing runtime secrets and storage configuration. Do not copy local
environment files into GitHub or the image. Let Render assign `PORT`.

For a fresh demo database only, configure the seed credentials described in
[DEMO-DEPLOYMENT.md](DEMO-DEPLOYMENT.md), use `npm run start:demo` to initialize it,
then switch back to `npm run start:deploy` and redeploy. Leaving Docker Command
blank also runs `start:demo` because it is the image default. Do not use
`start:reset-passwords` for routine deployment; see [PASSWORD-RESET.md](PASSWORD-RESET.md)
for that separate one-time operation.

## Verify and promote

1. Confirm the deployed Render commit matches the merged staging commit and
   migrations completed successfully in the service logs.
2. Open `https://YOUR-STAGING-API.onrender.com/api/docs`, then test login, menu,
   order creation, and kitchen updates against staging data.
3. If the web app is hosted separately, set its server-side `API_URL` to the
   staging API origin **without `/api`**, redeploy it, and confirm its deployment
   branch is `staging` in that host's settings.
4. Download the staging APK artifact (or published tester release), install it,
   and verify it connects to the staging API. Backend-only pushes do not rebuild
   APKs; use Android APK -> Run workflow -> `staging` when needed.
5. Once accepted, open a PR from `staging` into `main`. If Render should now serve
   main, change its Branch setting to `main` and deploy the merged commit. The
   API URL and database remain unchanged. If Render stays on `staging`, merging
   to main alone does not change the running API. To move the single Android
   update publisher to main, explicitly set `ANDROID_UPDATE_BRANCH=main`.

Application rollback does not reverse database migrations; check schema
compatibility before redeploying an older commit.

References: [Render deploys](https://render.com/docs/deploys),
[Render Docker configuration](https://render.com/docs/docker),
[GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
