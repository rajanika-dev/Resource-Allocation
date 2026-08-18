# Resource Verification MVP

See [SPEC.md](./SPEC.md) for the full product specification.

> **Status:** this repo currently contains the local project foundation only —
> pnpm workspace, PostgreSQL via Docker Compose, Drizzle schema/migrations,
> and deterministic demo seed data. Connectors, the verification engine,
> sync/employee/manager/executive APIs, and the real UI are implemented in
> later increments.

## Local Foundation — Setup from Scratch

### Prerequisites

* Node.js 20+
* pnpm 9+ (`corepack enable` or `npm install -g pnpm`)
* Docker Desktop (for PostgreSQL via Docker Compose)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults work out of the box with the bundled `docker-compose.yml`. Only
a PostgreSQL connection string and local app settings are required — no
external credentials of any kind.

### 3. Start PostgreSQL

```bash
pnpm docker:up
```

This starts a single `postgres:16` container on `localhost:5433` (mapped to
avoid colliding with Postgres instances from other local projects). Stop it
with `pnpm docker:down`.

### 4. Run migrations

```bash
pnpm db:migrate
```

### 5. Seed demo data

```bash
pnpm db:seed
```

This inserts the fixed fake demo dataset from `SPEC.md` section 6: 5 people,
3 projects, and planned allocations (including the Priya Shah allocation that
the future mismatch-detection logic will use).

### 6. Run the backend

```bash
pnpm dev:api
```

Starts the Fastify API on `http://localhost:3001`. Currently exposes only:

```http
GET /health
```

which returns `{ "status": "ok", "database": "connected" }` after verifying
it can reach PostgreSQL.

### 7. Run the frontend

```bash
pnpm dev:web
```

Starts the Vite dev server on `http://localhost:5173`. Currently shows only
a placeholder page confirming the local environment is running.

### 8. Type checking and tests

```bash
pnpm typecheck
pnpm test
```

### 9. Resetting demo state

```bash
pnpm demo:reset
```

Wipes all seeded/derived tables and re-inserts the original fixed demo
dataset, so the environment can be reset to a known state at any time.

## Repository Layout

```text
apps/web           React + TypeScript + Vite (placeholder UI for now)
apps/api           Fastify + TypeScript (GET /health for now)
packages/database   Drizzle ORM schema, migrations, seed/reset scripts
packages/connectors Reserved for future Allocation/Jira/Calendar connectors
packages/shared     Reserved for cross-cutting shared types
docker-compose.yml  PostgreSQL only
```
