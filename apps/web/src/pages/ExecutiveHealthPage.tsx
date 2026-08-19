import { api } from "../api/client";
import type { ExecutiveSummary, ManagerExceptions, ManagerPerson } from "../api/types";
import { AnalysisBadge, Avatar, ReviewBadge } from "../components/badges";
import { Card, EmptyState, ErrorState, Kpi, LoadingState, PageHeader, formatWeek } from "../components/primitives";
import { useAsync } from "../hooks/useAsync";

interface ExecutiveData {
  summary: ExecutiveSummary;
  team: ManagerExceptions;
}

/** Only unresolved findings are worth an executive's attention. */
function drillDownCandidates(people: ManagerPerson[]): ManagerPerson[] {
  return people
    .filter((person) => person.analysisStatus === "MISMATCH" || person.analysisStatus === "LOW_EVIDENCE")
    .sort((a, b) => {
      const rank = (person: ManagerPerson) => (person.analysisStatus === "MISMATCH" ? 0 : 1);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    })
    .slice(0, 4);
}

export function ExecutiveHealthPage({
  onOpenPerson,
  onRunSync,
  syncing,
}: {
  onOpenPerson: (personId: string) => void;
  onRunSync: () => void;
  syncing: boolean;
}) {
  const state = useAsync<ExecutiveData>(
    async () => {
      const [summary, team] = await Promise.all([api.getExecutiveSummary(), api.getManagerExceptions()]);
      return { summary, team };
    },
    [],
  );

  if (state.loading) return <LoadingState label="Loading resource health…" />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.refetch} />;
  if (!state.data) return null;

  const { summary, team } = state.data;
  const analysed = summary.mismatchCount + summary.lowEvidenceCount + summary.awaitingConfirmationCount;
  const notSynced = analysed === 0 && summary.verifiedCount === 0;

  if (notSynced) {
    return (
      <>
        <PageHeader title="Resource Health" subtitle="Weekly allocation assurance across the organisation" />
        <Card>
          <EmptyState
            title="No verification data for this week yet"
            message="Run a sync to analyse allocation, Jira and calendar signals."
            actionLabel="Run sync"
            onAction={onRunSync}
            busy={syncing}
          />
        </Card>
      </>
    );
  }

  const verifiedPercent =
    summary.peopleTracked > 0 ? Math.round((summary.verifiedCount / summary.peopleTracked) * 100) : 0;
  const openFindings = summary.mismatchCount + summary.lowEvidenceCount;
  const aligned = openFindings === 0 && summary.awaitingConfirmationCount === 0;
  const drillDowns = drillDownCandidates(team.people);

  return (
    <>
      <PageHeader
        title="Resource Health"
        subtitle="Are resources aligned, and what needs attention?"
        meta={
          <>
            {formatWeek(team.weekStart)}
            <br />
            <button type="button" className="btn-link" onClick={state.refetch}>
              Refresh
            </button>
          </>
        }
      />

      <div
        className={`callout ${aligned ? "callout-ok" : openFindings > 0 ? "callout-danger" : "callout-warn"}`}
        style={{ marginBottom: 16 }}
      >
        <div className="callout-title">
          {aligned
            ? "Resources are aligned"
            : openFindings > 0
              ? `${openFindings} allocation ${openFindings === 1 ? "issue" : "issues"} need review`
              : "Awaiting employee confirmations"}
        </div>
        {summary.verifiedCount} of {summary.peopleTracked} people verified ({verifiedPercent}%) across{" "}
        {summary.projectsTracked} active projects.
      </div>

      <div className="kpi-grid">
        <Kpi label="People tracked" value={summary.peopleTracked} hint={`${summary.projectsTracked} active projects`} />
        <Kpi
          label="Verified"
          value={summary.verifiedCount}
          hint={`${verifiedPercent}% of people`}
          tone={summary.verifiedCount > 0 ? "ok" : undefined}
        />
        <Kpi
          label="Awaiting review"
          value={summary.awaitingConfirmationCount}
          tone={summary.awaitingConfirmationCount > 0 ? "warn" : undefined}
        />
        <Kpi
          label="Mismatches"
          value={summary.mismatchCount}
          tone={summary.mismatchCount > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Low evidence"
          value={summary.lowEvidenceCount}
          tone={summary.lowEvidenceCount > 0 ? "warn" : undefined}
        />
        <Kpi label="Corrected" value={summary.correctedCount} hint="Employee-adjusted allocations" />
      </div>

      <div className="stack">
        <Card title="Needs attention" subtitle="Current state of this week's verification" bodyless>
          {summary.needsAttention.length === 0 ? (
            <div className="state">Nothing outstanding this week.</div>
          ) : (
            summary.needsAttention.map((item, index) => (
              <div className="needs-attention-item" key={item}>
                <span className={`dot ${index === 0 ? "dot-danger" : "dot-warn"}`} />
                <span>{item}</span>
              </div>
            ))
          )}
        </Card>

        {drillDowns.length > 0 && (
          <Card title="Drill down" subtitle="People behind the open findings" bodyless>
            <div className="row-list">
              {drillDowns.map((person) => (
                <button
                  type="button"
                  className="row"
                  key={person.personId}
                  onClick={() => onOpenPerson(person.personId)}
                >
                  <Avatar name={person.name} />
                  <div className="row-main">
                    <div className="row-name">{person.name}</div>
                    <div className="row-sub">{person.reason ?? ""}</div>
                  </div>
                  <div className="row-side">
                    <AnalysisBadge status={person.analysisStatus} />
                    <ReviewBadge status={person.reviewStatus} />
                    <span className="row-action">View →</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
