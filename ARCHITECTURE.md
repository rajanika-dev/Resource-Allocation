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
PostgreSQL              (not yet used for ResourceSignal[]/results — see status below)
        ↓
Fastify APIs
        ↓
React UI
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

## What this layer deliberately does NOT do (yet)

* persist `ResourceSignal[]` or `VerificationResult[]` to PostgreSQL,
* expose any of this over HTTP (`POST /api/sync`, employee/manager/executive
  APIs),
* human workflow states (`CONFIRMED` / `CORRECTED`) — those apply to a
  `VerificationResult` only after a person reviews it, which is a later
  increment,
* real Jira/Calendar/Sheets integrations, authentication, or any LLM usage.

## Current status

* **Implemented**: PostgreSQL + Drizzle schema/migrations/seed (Task 1);
  fake source files, mock connectors, and normalization into
  `ResourceSignal[]` (Task 2); the deterministic verification engine
  (Task 3). Run `pnpm connectors:demo` to see `ResourceSignal[]` for all
  five demo people, and `pnpm verification:demo` to see the full pipeline
  through to `VerificationResult[]`.
* **Not yet implemented**: persisting `ResourceSignal[]`/`VerificationResult[]`,
  `POST /api/sync`, the employee/manager/executive APIs, Confirm/Correct,
  and the real UI. `apps/api` currently exposes only `GET /health`, and
  `apps/web` shows only a placeholder page.
