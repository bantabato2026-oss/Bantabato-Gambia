# BANTABATO — Staging & Operations Readiness: Connector and Repository Audit

**Audit status:** Read-only. No connector was enabled, configured, called, or otherwise changed. No source-control push, remote configuration, deployment configuration, secret, provider, DNS, or production service was changed.

## Connector capability status

The configuration records all requested connector families as present but **disabled**. A disabled connector cannot establish a credentialed account scope, inspect provider resources, or safely perform a staging action. The capabilities below are limited to the connector descriptions available in the configuration; no provider capability is claimed as connected or authorized for this project.

| Connector | Available capability described by current configuration | Required credentials / user action | Safe staging action now | Production risk |
| --- | --- | --- | --- | --- |
| GitHub | Manage repositories, track code changes, and collaborate on projects. | Enable the connector only after the user authorizes a specific repository and permission scope. | Inspect local Git history and prepare a branch/release strategy only. | A write-capable scope could expose source, alter branches, or trigger workflows if mis-scoped. |
| Supabase / Supabase API | Manage projects, databases, authentication, storage, and related data operations. | Enable an authorized Supabase account/project scope; user must confirm creation or selection of a separate staging project. | Prepare architecture, migrations, RLS, storage, auth, and synthetic-data requirements only. | An incorrect project or service key could expose or alter production data, storage, authentication, or policies. |
| Sentry | Review errors, analyze root causes, and suggest fixes. | Enable an authorized Sentry organization/project scope and approve a new staging project with privacy settings. | Prepare data-scrubbing, environment, routing, retention, and alert-threshold configuration only. | Misconfiguration can transmit sensitive event data or route alerts to unintended recipients. |
| Cloudflare / Cloudflare API / Worker Bindings | Manage DNS, Workers, R2, and related account infrastructure. | Enable a least-privilege account/zone scope and obtain explicit approval for a dedicated staging hostname. | Prepare hostname, TLS, headers, caching, and WAF requirements only. | Mis-scoped permissions or a DNS change could interrupt production traffic or alter production storage/workers. |

> **BLOCKED — EXTERNAL ACTION REQUIRED:** Enable only the explicitly needed connector after a named owner supplies the authorized provider account, isolated staging target, and least-privilege scope. No connector should be enabled simply because it is listed.

## Local repository and release configuration

| Area | Verified finding | Staging implication |
| --- | --- | --- |
| Branch and remote | Local repository is on `main` tracking `origin/main`; the remote is project-managed. | Do not use `main` as a staging approval boundary without a separate, reviewed release workflow. |
| Working tree | The only observed uncommitted item during this audit was the current readiness checklist update. | Checkpoint before any handoff; do not push during this preparation. |
| Release history | Project checkpoints are the current version history; no semantic-release or external CI deployment manifest was found. | Use a named staging candidate checkpoint/release record before any staging deployment. |
| Deployment manifests | No Docker, Docker Compose, Vercel, Netlify, Render, Railway, Fly, or equivalent external deployment manifest was found at the inspected depth. | A staging hosting target and deployment configuration remain **NOT CONFIGURED**. |
| Build | `pnpm build` compiles the Vite client and Express server bundle; `pnpm check` and `pnpm test` are available. | These remain required staging gates before deployment and before any controlled test run. |
| Migrations | Drizzle targets MySQL and obtains `DATABASE_URL` only from the runtime environment. | Generate and review additive migrations against a distinct staging `DATABASE_URL`; never use a production connection string. |
| Secret handling | Local `.env` variants are ignored; the code expects runtime-injected values. | Never commit `.env*`, provider keys, DSNs, tokens, OAuth secrets, database URLs, storage credentials, or test credentials. |

## Clean staging and release strategy

1. A named release owner selects an already-validated checkpoint and records it as the staging candidate.
2. An infrastructure owner provisions an isolated hosting origin, database, storage namespace, OAuth registration, and provider sandbox configuration; each must differ from production through approved redacted comparison.
3. The owner injects staging-only secrets through the hosting/provider secret mechanism, never source control. The server’s runtime `APP_ENV` must be `staging` and the separate connection identity must be verified before migrations.
4. A reviewer reads generated migration SQL, applies it only to the staging database, and records the migration identifiers, UTC time, actor, and rollback plan.
5. The release owner validates TypeScript, full tests, build, dependency audit, health endpoint, staging isolation, and the approved synthetic-account smoke matrix before any promotion decision.

This strategy is preparatory only. It does not create a branch, external repository, deployment, database, storage namespace, OAuth client, environment variable, secret, migration execution, staging account, or production release.
