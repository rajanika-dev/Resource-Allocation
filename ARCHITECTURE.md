# Architecture

See [SPEC.md](./SPEC.md) for the full product specification. This document
explains the pipeline as it exists so far.

```text
Fake Sources
        ↓
Connectors
        ↓
Normalization
        ↓
ResourceSignal[]
        ↓
Verification Engine
        ↓
VerificationResult[]
        ↓
Persistence
        ↓
Human Review
        ↓
Fastify APIs
        ↓
React Frontend (Employee / Manager / Executive)
```

## Why a connector + normalization layer exists

Real external systems — Jira, Google Calendar, a planning spreadsheet — each
speak their own schema. `demo-data/allocations.json`, `demo-data/jira.json`,
and `demo-data/calendar.json` are deliberately shaped like three different
systems (different field names, different identifiers: `projectCode` vs.
`projectKey` vs. `projectLabel`) to prove that point locally with fake data.

A **connector** (`MockAllocationConnector`, `MockJiraConnector`,
`MockCalendarConnector` in `packages/connectors`) is the only piece of code
that knows a given source's raw shape. Each one:

* reads its own JSON file,
* validates just enough structure to fail clearly on malformed input,
* filters to the requested demo week,
* returns its own source-specific raw type (`RawAllocation`,
  `RawJiraActivity`, `RawCalendarActivity`) — never a shared type.

**Normalization** (`packages/connectors/src/normalize`) then converts each
raw type into the one common representation, `ResourceSignal`
(`packages/shared`):

```ts
interface ResourceSignal {
  personId: string;      // stable people.id, resolved from the source's email
  projectId: string;     // stable projects.id, resolved from the source's code/label
  source: "allocation" | "jira" | "calendar";
  signalType: "declared_allocation" | "work_activity" | "meeting_activity";
  quantity: number;       // percent, issue count, or hours — meaning depends on signalType
  weekStart: string;
  evidence: Record<string, unknown>; // preserved source-specific context for display
}
```

Normalization also resolves each source's fake identifiers (an email, a
project code/key/label) to the stable `people.id` / `projects.id` rows
already seeded in PostgreSQL by Task 1 (`packages/connectors/src/identity.ts`).
This means everything downstream of normalization works with stable internal
IDs, never with names like `"Priya Shah"` or `"Project Beacon"`.

The payoff: connectors/normalization can change independently of everything
downstream. Swapping `MockJiraConnector` for a `RealJiraConnector` later
requires no change to the verification engine, because the normalized
contract doesn't change — only the connector that produces it does.

## Why verification consumes ResourceSignal, not vendor schemas

`packages/verification` (`runVerificationEngine`) takes only
`ResourceSignal[]` as input. It has no knowledge of Jira issues, Calendar
events, or allocation spreadsheets — it only understands `source`,
`signalType`, `quantity`, `personId`, `projectId`, and `weekStart`. This is
what lets the same engine keep working, unmodified, no matter which
connector produced the signals or how many more sources are added later
(SPEC.md section 12 / Task 3 "pure business logic").

For each `(personId, weekStart)` pair present in the data, the engine:

1. **Builds three distributions** — planned (from `allocation` /
   `declared_allocation` signals), Jira (`jira` / `work_activity`), and
   Calendar (`calendar` / `meeting_activity`) — each normalized to
   percentages across only the projects that have signals. Unassigned
   capacity is never represented as a project.
2. **Combines Jira and Calendar into one observed distribution**, weighted
   **Jira 65% / Calendar 35%** (`JIRA_WEIGHT`, `CALENDAR_WEIGHT` in
   `packages/verification/src/constants.ts`). If only one source has
   **minimum evidence** — total Jira activity ≥ `MIN_JIRA_ACTIVITY` (2) or
   total Calendar hours ≥ `MIN_CALENDAR_HOURS` (2) — that source is used
   alone rather than treating the missing source as zero.
3. **Classifies the result**:
   * `LOW_EVIDENCE` (confidence `LOW`) when *both* Jira and Calendar are
     below their minimums — there isn't enough signal to compare against
     the plan at all.
   * Otherwise, the **distribution gap** — the total variation distance
     between planned and observed, on a 0–100 scale — decides the status:
     `MISMATCH` when the gap is ≥ `MISMATCH_GAP_THRESHOLD` (50), otherwise
     `CONSISTENT`.
4. **Assigns confidence** — a description of evidence *quality/agreement*,
   never a statistical or AI probability:
   * `HIGH`: both sources meet minimum evidence and broadly agree (their
     own distribution gap ≤ `SOURCE_AGREEMENT_MAX_GAP`, 25).
   * `MEDIUM`: enough evidence to classify, but only one source is
     meaningful, or Jira and Calendar materially disagree.
   * `LOW`: the `LOW_EVIDENCE` case only.
5. **Generates a deterministic, human-readable reason** from the calculated
   distributions — no LLM. The engine only knows project IDs; a caller
   (e.g. the demo runner) may pass a `resolveProjectName` function purely
   for the reason text, which has no effect on classification.

None of this is hard-coded per person — see `packages/verification/src/noHardcoding.test.ts`,
which scans the engine's own source for any of the five demo people's names
and fails if one appears.

## Machine analysis vs. human review

This distinction is the core idea of the persistence/workflow layer (Task 4)
and the two are deliberately never merged into one status:

```text
Machine analysis (what the system detected — recomputed by every /api/sync run)
  analysisStatus: CONSISTENT | MISMATCH | LOW_EVIDENCE
  confidence:     HIGH | MEDIUM | LOW

Human review (what the person later did about it — set only by Confirm/Correct)
  reviewStatus:   AWAITING_CONFIRMATION | CONFIRMED | CORRECTED
```

Both live on the same `weekly_verifications` row, in separate columns. When
Priya's Jira/Calendar activity is concentrated on Project Beacon despite her
plan emphasizing Project Atlas, the engine correctly finds `analysisStatus =
MISMATCH`. If she then corrects her allocation, that does **not** change the
machine's finding — it remains `MISMATCH`; only `reviewStatus` moves from
`AWAITING_CONFIRMATION` to `CORRECTED`. The engine was right that
`planned work != observed work` for that week; the correction is Priya's
resolution of that finding, not a retraction of it.

This also means a re-run of `/api/sync` is safe: it recomputes
`analysisStatus`/`confidence`/`reason`/`distributionGap` from the current
signals, but never overwrites an existing `reviewStatus` or the
`verification_decisions` history — see `packages/api`'s `syncService`
(`onConflictDoUpdate` intentionally omits `review_status` from its `SET`
clause).

## Persistence

`POST /api/sync` is the only place `ResourceSignal[]` and
`VerificationResult[]` get written to PostgreSQL:

* **`activity_signals`** — one row per `ResourceSignal`. Idempotency is a
  simple replace-then-insert scoped to the requested week (delete existing
  rows for that `week_start`, then insert the freshly normalized signals) —
  the simplest strategy that avoids uncontrolled duplicates without needing
  event sourcing or a queue.
* **`weekly_verifications`** — one row per `(person_id, week_start)`,
  upserted on that existing unique constraint. `reviewStatus` defaults to
  `AWAITING_CONFIRMATION` only on first insert.
* **`verification_projects`** — one row per project the engine's
  distributions touched that week (planned/Jira/Calendar/observed
  percentages), replace-then-insert per verification.
* **`verification_decisions`** — append-only history of `CONFIRM`/`CORRECT`
  actions. The Employee Week API surfaces the *latest* one. Critically,
  **`planned_allocations` is never written to by Confirm/Correct** — it
  stays the original planning-source record; a correction is a new decision
  row, not an edit to history (SPEC.md section 3 / Task 4 section 3).

## Frontend

`apps/web` is a small React + Vite app that reads only the Fastify APIs — it
holds no verification logic of its own. Three persona experiences share one
shell:

* **Employee** (`#/employee`, bound to Priya Shah) — *My Week*: the machine
  finding, planned vs observed per project, per-source evidence, and the only
  place Confirm/Correct exist.
* **Manager** (`#/manager`) — *Team Verification*: an exception-first list
  ordered by unresolved risk, plus a read-only drill-down per person.
* **Executive** (`#/executive`) — *Resource Health*: compact KPIs, a short
  Needs Attention list, and a drill-down into the people behind open findings.

Two decisions matter for the demo. First, the **Viewing as** switcher changes
the route, not just a label: navigation, landing page, information density and
available actions all differ, and responding to a finding is an Employee-only
action. Second, routing is hash-based, so a browser refresh returns to the
same screen — which is how the demo proves a correction came back from
PostgreSQL rather than from React state.

The UI mirrors the machine/human split described above: `WeekDetail` renders
"Machine analysis" and "Your review" as two separate panes, so a correction
visibly moves the review state to `CORRECTED` while the analysis stays
`MISMATCH`.

## What this layer deliberately does NOT do

* real authentication/RBAC — the persona switcher is an explicit demo
  simulation; the manager/executive APIs treat all five seeded people as one
  demo team,
* real Jira/Calendar/Sheets/Gmail/Confluence integrations, AWS deployment,
  or any LLM usage.

## Current status

The whole vertical slice is implemented: PostgreSQL + Drizzle
schema/migrations/seed; fake source files, mock connectors and normalization
into `ResourceSignal[]`; the deterministic verification engine; persistence,
human review and the Fastify API layer; and the React frontend.

Useful entry points:

* `pnpm connectors:demo` / `pnpm verification:demo` — the in-memory pipeline.
* `pnpm workflow:demo` — the full persistent backend story (sync → correct →
  manager → executive) with no frontend involved, as a demo fallback.
* `pnpm dev:api` + `pnpm dev:web` — the live UI demo.

Not implemented, by design: authentication/RBAC and any real external
integration.
