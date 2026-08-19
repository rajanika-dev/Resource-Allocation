import { api } from "../api/client";
import type { ManagerExceptions, ManagerPerson } from "../api/types";
import { AnalysisBadge, Avatar, ConfidenceBadge, ReviewBadge } from "../components/badges";
import { Card, EmptyState, ErrorState, Kpi, LoadingState, PageHeader, formatWeek } from "../components/primitives";
import { useAsync } from "../hooks/useAsync";

/** Exception-first ordering: unresolved problems first, settled people last. */
function attentionRank(person: ManagerPerson): number {
  if (person.analysisStatus === "MISMATCH" && person.reviewStatus === "AWAITING_CONFIRMATION") return 0;
  if (person.analysisStatus === "LOW_EVIDENCE" && person.reviewStatus === "AWAITING_CONFIRMATION") return 1;
  if (person.analysisStatus === "MISMATCH") return 2;
  if (person.reviewStatus === "AWAITING_CONFIRMATION") return 3;
  return 4;
}

function needsAttention(person: ManagerPerson): boolean {
  return attentionRank(person) <= 3;
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

  const sorted = [...people].sort((a, b) => attentionRank(a) - attentionRank(b) || a.name.localeCompare(b.name));
  const attention = sorted.filter(needsAttention);
  const settled = sorted.filter((person) => !needsAttention(person));

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
          subtitle="Unresolved findings and outstanding responses, most urgent first"
          meta={`${attention.length} of ${summary.peopleTracked}`}
          bodyless
        >
          {attention.length === 0 ? (
            <div className="state">Everyone has responded and no findings are outstanding.</div>
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
