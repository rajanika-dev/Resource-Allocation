# Demo script (3–5 minutes)

The story: **the system detects a resource mismatch, a human resolves it, and
every view updates from persisted state.**

## Before you start

```bash
pnpm docker:up
pnpm db:migrate
pnpm demo:reset     # clean, pre-sync state
pnpm dev:api        # terminal 1
pnpm dev:web        # terminal 2
```

Open `http://localhost:5173`. You should land on **Resource Health** showing
"No verification data for this week yet".

> Fallback: if the browser or dev servers misbehave, `pnpm workflow:demo`
> tells the same story entirely through the backend, in one command.

---

## 1. Initialise (15s)

Press **Run sync**.

> "Three fake sources — a planning sheet, a Jira-like feed and a calendar
> feed — are read, normalised into one internal signal format, and scored by a
> deterministic engine. No LLM anywhere in that path."

## 2. Executive: is anything wrong? (30s)

The **Resource Health** page answers three questions and nothing more:

- **2 allocation issues need review**, 0 of 5 people verified
- Needs attention: 1 mismatch, 1 person with insufficient evidence, 5 unconfirmed
- Drill down: Priya Shah (Mismatch), Jordan Lee (Low evidence)

> "Deliberately low-noise. No charts that don't drive a decision."

## 3. Manager: who needs attention? (45s)

Switch **Viewing as → Manager**.

**Team Verification** is exception-first: Priya (Mismatch, HIGH confidence)
and Jordan (Low evidence) sort above the three consistent people.

Click **Priya Shah**.

> "The manager sees the same evidence the employee sees — but read-only.
> Responding to a finding is the employee's action."

Point out **Project Beacon — Not in plan, 89% observed** versus **Project
Atlas — 75% planned, 11% observed**, and the three evidence columns:
9 Jira issues and 7 meeting hours on Beacon, 1 and 1 on Atlas.

## 4. Employee: explain and correct (90s)

Switch **Viewing as → Employee** (Priya Shah). Note this is a genuinely
different experience — different navigation, different density, and Confirm /
Correct actions that no other persona has.

> "Machine analysis says MISMATCH with HIGH confidence — high because Jira and
> the calendar independently agree. Confidence describes evidence quality, not
> a probability."

Click **Correct allocation**, enter:

| Project | % |
| --- | --- |
| Project Atlas | 30 |
| Project Beacon | 50 |
| Project Cedar | 20 |

Add a comment, press **Save correction**.

## 5. Prove it persisted (30s)

Press **F5** — a real browser reload, not an in-app refresh.

The correction is still there, because it came back from PostgreSQL.

> **The key point:** Machine analysis is still **Mismatch**. Only *Your review*
> moved to **Corrected**. The system was right that planned ≠ observed; the
> correction is the human's resolution of that finding, not a retraction of
> it. The original `planned_allocations` rows are untouched — we keep the
> original plan, the observed evidence, the machine interpretation and the
> human correction as four separate facts.

## 6. Back up the chain (45s)

**Viewing as → Manager**: Priya now shows `Mismatch` + `Corrected`;
Corrected 1, Awaiting response 4. Jordan has moved to the top — an unresolved
case now outranks a resolved one.

**Viewing as → Executive**: Verified 1 (20%), Corrected 1, Awaiting review 4,
and "4 people have not confirmed their week".

> "One human decision, persisted once, and every view reflects it — no code
> changes, no frontend state tricks."

---

## Reset between runs

```bash
pnpm demo:reset
```
