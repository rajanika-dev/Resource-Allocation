# Resource Verification MVP

## 1. Product Goal

Build a small, fully working end-to-end prototype that demonstrates proactive resource verification across three organizational pillars:

* People
* Products / Projects
* Delivery

The system should:

1. Read planned resource allocations.
2. Read observed work signals from multiple independent sources.
3. Normalize the sources into a common internal representation.
4. Compare planned allocations against observed activity.
5. Detect consistent assignments, mismatches, and insufficient evidence.
6. Present the evidence to a human.
7. Allow the human to confirm or correct the result.
8. Persist the decision.
9. Update manager and executive views based on the persisted state.

The MVP must demonstrate a complete working vertical slice rather than broad feature coverage.

---

# 2. MVP Scope

Build exactly three personas:

1. Employee
2. Manager
3. Executive

Build exactly three project/activity sources:

1. Planned Allocation source
2. Jira-like activity source
3. Calendar-like activity source

All sources must initially use completely fake local demo data.

No real company data or credentials may be required.

---

# 3. Non-Goals

Do NOT implement in this version:

* real Jira authentication
* real Google Calendar authentication
* Gmail
* Confluence
* AWS deployment
* real organizational SSO
* production RBAC
* financial metrics
* sales/revenue metrics
* skills matching
* attrition prediction
* staffing recommendation engine
* Ask the Org chatbot
* LLM-dependent inference
* five separate personas
* full Workforce OS functionality
* microservices
* Kubernetes
* event streaming
* unnecessary enterprise abstractions

Keep the application intentionally small and understandable.

---

# 4. Technology Stack

Use:

Frontend:

* React
* TypeScript
* Vite

Backend:

* Node.js
* TypeScript
* Fastify

Database:

* PostgreSQL

ORM:

* Drizzle ORM

Package manager:

* pnpm

Infrastructure:

* Docker Compose for PostgreSQL

Testing:

* Vitest

Repository style:

* pnpm workspace / monorepo

Do not substitute frameworks without an explicit reason.

---

# 5. Repository Structure

Create approximately:

```text
resource-verification-mvp/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── database/
│   ├── connectors/
│   └── shared/
│
├── demo-data/
│   ├── allocations.json
│   ├── jira.json
│   └── calendar.json
│
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── SPEC.md
├── README.md
├── ARCHITECTURE.md
└── DEMO.md
```

Avoid adding architectural layers unless they have a concrete purpose.

---

# 6. Demo Organization

Use only fake data.

## People

Create five employees:

* Maya Chen
* Jordan Lee
* Priya Shah
* Marcus Reed
* Elena Garcia

Assign fake email addresses under an example domain.

Example:

`maya.chen@example.test`

## Projects

Create exactly three active projects:

* Project Atlas
* Project Beacon
* Project Cedar

---

# 7. Primary Demo Scenario

Priya Shah is the primary mismatch case.

## Planned Allocation

Priya:

* Project Atlas: 60%
* Project Cedar: 20%

Remaining capacity may be represented as unallocated/internal capacity.

## Observed Jira-like Activity

For the selected demo week:

Priya:

* Project Atlas: 1 relevant issue
* Project Beacon: 9 relevant issues

## Observed Calendar-like Activity

Priya:

* Project Atlas: 1 hour
* Project Beacon: 7 hours

The system should therefore identify strong observed activity on Project Beacon despite the planned allocation emphasizing Project Atlas.

Expected initial result:

```text
Priya Shah
Status: MISMATCH

Planned:
Project Atlas — 60%
Project Cedar — 20%

Observed:
Project Beacon — dominant activity

Evidence:
9 Project Beacon Jira activities
7 Project Beacon meeting hours
```

The employee must be able to correct the allocation to something such as:

```text
Project Atlas — 30%
Project Beacon — 50%
Project Cedar — 20%
```

The exact correction values may be entered through the UI.

The saved correction must persist after a browser refresh.

---

# 8. Additional Demo Cases

The remaining people should produce a mixture of states.

For example:

Maya Chen:

* planned and observed work agree
* result: CONSISTENT

Jordan Lee:

* insufficient source activity
* result: LOW_EVIDENCE or AWAITING_CONFIRMATION

Marcus Reed:

* planned and observed work agree
* result: CONSISTENT

Elena Garcia:

* planned and observed work mostly agree
* result: CONSISTENT

Use enough fake source evidence to make the states deterministic.

---

# 9. Connector Architecture

Create three source connector interfaces.

Examples:

```ts
interface AllocationConnector {
  fetchAllocations(weekStart: string): Promise<RawAllocation[]>;
}

interface JiraConnector {
  fetchActivity(weekStart: string): Promise<RawJiraActivity[]>;
}

interface CalendarConnector {
  fetchActivity(weekStart: string): Promise<RawCalendarActivity[]>;
}
```

Initial implementations:

* MockAllocationConnector
* MockJiraConnector
* MockCalendarConnector

They must read from the local JSON demo files.

Do not hard-code the entire final inference result into a connector.

Each connector should only return source-specific information.

The purpose of this abstraction is to allow a future real Jira or Google connector to replace a mock connector without changing the verification engine.

---

# 10. Normalized Resource Signal

Different source formats must be transformed into a common internal representation.

Create a shared type conceptually similar to:

```ts
type SignalSource = "allocation" | "jira" | "calendar";

type SignalType =
  | "declared_allocation"
  | "work_activity"
  | "meeting_activity";

interface ResourceSignal {
  personId: string;
  projectId: string;
  source: SignalSource;
  signalType: SignalType;
  quantity: number;
  weekStart: string;
  evidence: Record<string, unknown>;
}
```

The verification engine should consume normalized signals rather than raw Jira or Calendar payloads.

---

# 11. Verification Logic

Do NOT use an LLM to decide whether there is a mismatch.

Use deterministic, testable logic.

## Observed Activity

For observed work, calculate project distribution from:

* Jira activity share: weight 65%
* Calendar activity share: weight 35%

Example:

Priya Jira:

* Atlas = 1
* Beacon = 9

Jira shares:

* Atlas = 10%
* Beacon = 90%

Priya Calendar:

* Atlas = 1 hour
* Beacon = 7 hours

Calendar shares:

* Atlas = 12.5%
* Beacon = 87.5%

Observed Beacon score should therefore be very high.

## Verification States

Support these states:

```text
CONSISTENT
MISMATCH
LOW_EVIDENCE
AWAITING_CONFIRMATION
CONFIRMED
CORRECTED
```

Use clear rules and constants rather than scattered magic numbers.

The rules must be documented and unit-tested.

A mismatch should occur when:

* declared allocation strongly favors one project, and
* observed activity strongly favors another project, and
* sufficient observed evidence exists.

LOW_EVIDENCE should be returned when there is not enough observed activity to make a meaningful comparison.

Confidence should be presented as:

```text
HIGH
MEDIUM
LOW
```

Do not generate fake percentages such as "87.42% AI confidence."

HIGH can mean Jira and Calendar strongly support the same conclusion.

MEDIUM can mean only one source strongly supports the conclusion.

LOW can mean evidence is sparse or conflicting.

---

# 12. Database Schema

Implement Drizzle schemas and migrations for approximately the following entities.

## people

Fields:

```text
id
name
email
manager_id
department
role
weekly_capacity_hours
created_at
```

## projects

```text
id
name
status
created_at
```

## planned_allocations

```text
id
person_id
project_id
percentage
valid_from
valid_to
source
created_at
```

## activity_signals

```text
id
person_id
project_id
source
activity_type
quantity
week_start
evidence_json
created_at
```

## weekly_verifications

```text
id
person_id
week_start
status
confidence
generated_at
```

## verification_projects

```text
id
verification_id
project_id
planned_percentage
observed_percentage
```

## verification_decisions

```text
id
verification_id
decision
corrected_allocations_json
comment
decided_by
created_at
```

Use foreign keys appropriately.

Use effective dates for planned allocations.

---

# 13. Sync Workflow

Implement:

```http
POST /api/sync
```

For the MVP, this endpoint should:

1. Read all three mock sources.
2. Normalize their data.
3. Persist relevant normalized signals.
4. Run the verification engine for all demo employees.
5. Persist/update weekly verification results.
6. Return a summary.

Repeated sync runs should not create uncontrolled duplicate records.

Use a clearly defined demo week.

---

# 14. Employee APIs

Implement:

```http
GET /api/employees/:id/week
```

Return:

* person
* week
* planned allocations
* observed project activity
* evidence
* status
* confidence
* existing human decision if one exists

Implement:

```http
POST /api/employees/:id/week/confirm
```

This must persist confirmation.

Implement:

```http
POST /api/employees/:id/week/correct
```

Request body must allow corrected allocation percentages and an optional comment.

Validate that corrected allocation percentages are sensible.

Persist the correction.

---

# 15. Manager API

Implement:

```http
GET /api/manager/exceptions
```

For the MVP there is no real login.

Return the demo team's verification state.

Allow filtering or grouping by:

* mismatch
* awaiting confirmation
* low evidence
* confirmed
* corrected

The manager should be able to inspect an employee's evidence and decision.

---

# 16. Executive API

Implement:

```http
GET /api/executive/summary
```

Return an aggregated resource-health summary.

Include at minimum:

```text
peopleTracked
verifiedCount
mismatchCount
awaitingConfirmationCount
lowEvidenceCount
correctedCount
projectsTracked
```

Include a small list of items that need attention.

Do not create a giant executive analytics API.

---

# 17. Frontend — General

The UI should be clean and professional but not over-designed.

Use the existing Workforce OS concept as inspiration for:

* hierarchy
* clarity
* clean cards
* status indicators
* "Viewing As" behavior

Do not attempt to duplicate every page from that prototype.

The MVP should contain exactly three primary experiences:

* Employee
* Manager
* Executive

---

# 18. Viewing As

Add a visible persona selector:

```text
Viewing as:
Employee
Manager
Executive
```

This is explicitly a demo/persona simulation.

It is NOT real authorization.

Selecting a persona must meaningfully change the view and API data being displayed.

Do not merely change a highlighted role label.

---

# 19. Employee View

Title:

```text
My Week
```

Show:

* week
* planned allocation
* observed activity
* source evidence
* verification status
* confidence
* Confirm
* Correct

For Priya, prominently display:

```text
Possible allocation mismatch
```

Show evidence in understandable language, such as:

```text
Project Beacon
- 9 Jira activities
- 7 meeting hours

Project Atlas
- 1 Jira activity
- 1 meeting hour
```

The user should be able to open a correction form and submit updated allocation percentages.

After a successful decision:

* show a success state
* reload data from the API
* do not rely only on temporary frontend state

Refresh must preserve the decision.

---

# 20. Manager View

Title:

```text
Team Verification
```

Display summary counts such as:

```text
5 people tracked
3 verified
1 mismatch
1 awaiting review
```

Display a compact table/list such as:

```text
Priya Shah     Mismatch       Review
Jordan Lee     Low evidence   Review
Maya Chen      Confirmed      View
```

A Review action should show:

* planned allocation
* observed activity
* evidence
* employee decision/correction if available

If Priya corrects her allocation from the Employee view, the Manager view must reflect that updated state without changing source code.

---

# 21. Executive View

Title:

```text
Resource Health
```

This page must intentionally be low-noise.

Do NOT reproduce the information-heavy existing executive page.

Focus on three areas:

## People

Examples:

```text
5 tracked
80% verified
```

## Products

Examples:

```text
3 active projects
1 allocation discrepancy
```

## Delivery / Needs Attention

Examples:

```text
1 resource issue requires review
1 person has not verified the week
```

Include a small "Needs Attention" list.

The dashboard should answer:

1. Are resources generally healthy?
2. What currently needs attention?
3. Where can I drill down?

Avoid unnecessary charts.

---

# 22. Persistence Requirement

This is critical.

If Priya corrects her allocation:

1. Save it through the backend.
2. Persist it to PostgreSQL.
3. Reload the page from the API.
4. The correction must still be present.
5. Manager view must show it.
6. Executive aggregation must reflect it where appropriate.

Do not simulate success solely with frontend state.

---

# 23. Seed and Reset

Create commands for:

```bash
pnpm db:migrate
pnpm db:seed
pnpm demo:reset
```

`demo:reset` should restore the original fake demo state so the demonstration can be repeated reliably.

---

# 24. Documentation

Before the MVP is considered finished, create:

## README.md

Explain from a clean machine:

* prerequisites
* installation
* environment setup
* starting Postgres
* migrations
* seeding
* running frontend/backend
* running tests
* resetting demo state

## ARCHITECTURE.md

Explain:

```text
Fake External Sources
        ↓
Connector Adapters
        ↓
Normalized Resource Signals
        ↓
Verification Engine
        ↓
PostgreSQL
        ↓
Fastify APIs
        ↓
React UI
```

Explain why connector abstraction and normalization exist.

## DEMO.md

Create a 3–5 minute demo script.

The demo should include:

1. Executive sees one mismatch.
2. Manager reviews Priya.
3. Employee view shows evidence.
4. Priya corrects the allocation.
5. Refresh proves persistence.
6. Manager now sees corrected status.
7. Executive summary updates.

---

# 25. Testing

Create automated tests for at minimum:

## Verification engine

* consistent planned/observed assignment
* mismatch
* insufficient evidence
* conflicting sources

## APIs

* sync generates verification results
* confirming persists a decision
* correcting persists corrected allocations
* manager endpoint reflects correction
* executive summary aggregates current state

Do not test only implementation details.

Test externally visible behavior.

---

# 26. Error Handling

Create basic useful failure states.

Examples:

* connector failed
* malformed demo input
* employee not found
* invalid allocation percentages
* database unavailable

Do not over-engineer retries or distributed fault tolerance.

---

# 27. Environment

Provide `.env.example`.

No actual secrets.

The base MVP should require only a PostgreSQL connection string and local application settings.

Do NOT require:

* Jira credentials
* Google credentials
* AWS credentials
* LLM keys

---

# 28. Definition of Done

The MVP is complete only when all of these are true:

* `pnpm install` works.
* PostgreSQL starts through Docker Compose.
* database migrations run.
* demo seed runs.
* frontend runs.
* backend runs.
* all three mock connectors independently load source data.
* normalized resource signals are created.
* `POST /api/sync` works.
* Priya is automatically identified as a mismatch.
* Employee UI shows the mismatch and source evidence.
* Confirm works.
* Correct works.
* corrected allocation persists after refresh.
* Manager UI reflects the persisted decision.
* Executive summary reflects current persisted state.
* Viewing As changes between three genuinely different experiences.
* verification-engine unit tests pass.
* relevant API tests pass.
* no real company credentials or data are needed.
* demo state can be reset.
* README provides clean setup instructions.
* ARCHITECTURE.md explains the system.
* DEMO.md provides a repeatable demo flow.

---

# 29. Engineering Constraints

Follow these rules throughout implementation.

1. Prefer simple code over speculative abstraction.
2. Do not introduce infrastructure that is not needed by the MVP.
3. Keep business logic outside React components.
4. Keep connector-specific schemas outside the verification engine.
5. Do not hard-code verification outcomes.
6. Do not use an LLM for deterministic mismatch detection.
7. Use clear TypeScript types.
8. Keep functions small and testable.
9. Do not hide failures.
10. Do not continue to the next major phase while the current phase is failing.
11. Run tests and type checking after meaningful changes.
12. Document important architectural decisions.
13. Never add real credentials or company data.
14. When choosing between a clever implementation and one that is easier for another engineer to explain and modify, choose the easier-to-understand implementation.

---

# 30. Future Extension Points

Do not implement these now, but maintain boundaries allowing future replacement:

```text
MockJiraConnector
→ RealJiraConnector
```

```text
MockCalendarConnector
→ GoogleCalendarConnector
```

```text
MockAllocationConnector
→ GoogleSheetsAllocationConnector
```

Potential future additions:

* real authentication
* server-side RBAC
* Confluence evidence
* richer delivery data
* LLM-generated explanations
* AWS deployment
* organization-wide data
* executive metrics
* audit history

Do not build them until explicitly requested.
