import { api } from "../api/client";
import type { ManagerExceptions, ManagerPerson } from "../api/types";
import { AnalysisBadge, Avatar, ConfidenceBadge, ReviewBadge } from "../components/badges";
import { Card, EmptyState, ErrorState, Kpi, LoadingState, PageHeader, formatWeek } from "../components/primitives";
import { useAsync } from "../hooks/useAsync";

/**
 * A true anomaly is something the engine actually flagged. Someone who is
 * CONSISTENT but has not replied yet is an outstanding task, not an
 * exception — mixing the two would put the whole team in the queue and
 * defeat the exception-first design.
 */
function isAnomaly(person: ManagerPerson): boolean {
  return person.analysisStatus === "MISMATCH" || person.analysisStatus === "LOW_EVIDENCE";
}

/** Within the anomaly queue: unanswered first, then mismatches before low evidence. */
function anomalyRank(person: ManagerPerson): number {
  const unanswered = person.reviewStatus === "AWAITING_CONFIRMATION" ? 0 : 1;
  const severity = person.analysisStatus === "MISMATCH" ? 0 : 1;
  return unanswered * 2 + severity;
}

function PersonRow({ person, onOpen }: { person: ManagerPerson; onOpen: () => void }) {
  return (
    <button type="button" className="row" onClick={onOpen}>
      <Avatar name={person.name} />
      <div className="row-main">
        <div className="row-name">{person.name}</div>
        <div className="row-sub">{person.reason ?? person.role ?? "No verification for this week"}</div>
      </div>
      <div className="row-side">
        <AnalysisBadge status={person.analysisStatus} />
        <ConfidenceBadge confidence={person.confidence} />
        <ReviewBadge status={person.reviewStatus} />
        <span className="row-action">Review →</span>
      </div>
    </button>
  );
}

export function ManagerTeamPage({
  onOpenPerson,
  onRunSync,
  syncing,
}: {
  onOpenPerson: (personId: string) => void;
  onRunSync: () => void;
  syncing: boolean;
}) {
  const exceptions = useAsync<ManagerExceptions>(() => api.getManagerExceptions(), []);

  if (exceptions.loading) return <LoadingState label="Loading team verification…" />;
  if (exceptions.error) return <ErrorState message={exceptions.error} onRetry={exceptions.refetch} />;
  if (!exceptions.data) return null;

  const { summary, people, weekStart } = exceptions.data;
  const notSynced = people.every((person) => person.analysisStatus === null);

  if (notSynced) {
    return (
      <>
        <PageHeader title="Team Verification" subtitle="Adams Engineering — weekly resource assurance" />
        <Card>
          <EmptyState
            title="No verification data for this week yet"
            message="Run a sync to analyse the team's allocation, Jira and calendar signals."
            actionLabel="Run sync"
            onAction={onRunSync}
            busy={syncing}
          />
        </Card>
      </>
    );
  }

  const byName = (a: ManagerPerson, b: ManagerPerson) => a.name.localeCompare(b.name);

  const attention = people.filter(isAnomaly).sort((a, b) => anomalyRank(a) - anomalyRank(b) || byName(a, b));
  const awaiting = people
    .filter((person) => !isAnomaly(person) && person.reviewStatus === "AWAITING_CONFIRMATION")
    .sort(byName);
  const settled = people
    .filter((person) => !isAnomaly(person) && person.reviewStatus !== "AWAITING_CONFIRMATION")
    .sort(byName);

  return (
    <>
      <PageHeader
        title="Team Verification"
        subtitle="Who needs attention this week, why, and whether they have responded"
        meta={
          <>
            {formatWeek(weekStart)}
            <br />
            <button type="button" className="btn-link" onClick={exceptions.refetch}>
              Refresh
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <Kpi label="People tracked" value={summary.peopleTracked} />
        <Kpi
          label="Mismatches"
          value={summary.mismatch}
          tone={summary.mismatch > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Low evidence"
          value={summary.lowEvidence}
          tone={summary.lowEvidence > 0 ? "warn" : undefined}
        />
        <Kpi
          label="Awaiting response"
          value={summary.awaitingConfirmation}
          tone={summary.awaitingConfirmation > 0 ? "warn" : undefined}
        />
        <Kpi label="Confirmed" value={summary.confirmed} tone={summary.confirmed > 0 ? "ok" : undefined} />
        <Kpi label="Corrected" value={summary.corrected} />
      </div>

      <div className="stack">
        <Card
          title="Needs attention"
          subtitle="Mismatches and low-evidence weeks, unanswered first"
          meta={`${attention.length} of ${summary.peopleTracked}`}
          bodyless
        >
          {attention.length === 0 ? (
            <div className="state">No mismatches or low-evidence weeks on the team.</div>
          ) : (
            <div className="row-list">
              {attention.map((person) => (
                <PersonRow
                  key={person.personId}
                  person={person}
                  onOpen={() => onOpenPerson(person.personId)}
                />
              ))}
            </div>
          )}
        </Card>

        {awaiting.length > 0 && (
          <Card
            title="Awaiting confirmation"
            subtitle="No findings — these people just have not confirmed their week yet"
            meta={`${awaiting.length}`}
            bodyless
          >
            <div className="row-list">
              {awaiting.map((person) => (
                <PersonRow
                  key={person.personId}
                  person={person}
                  onOpen={() => onOpenPerson(person.personId)}
                />
              ))}
            </div>
          </Card>
        )}

        {settled.length > 0 && (
          <Card title="Resolved" subtitle="Verified and responded" meta={`${settled.length}`} bodyless>
            <div className="row-list">
              {settled.map((person) => (
                <PersonRow
                  key={person.personId}
                  person={person}
                  onOpen={() => onOpenPerson(person.personId)}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
