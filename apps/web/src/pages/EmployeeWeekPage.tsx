import { useState } from "react";
import { api } from "../api/client";
import type { CorrectedAllocationInput, EmployeeWeek } from "../api/types";
import { CorrectionEditor } from "../components/CorrectionEditor";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, formatWeek } from "../components/primitives";
import { WeekDetail } from "../components/WeekDetail";
import { useAsync } from "../hooks/useAsync";

export function EmployeeWeekPage({
  personId,
  onRunSync,
  syncing,
}: {
  personId: string;
  onRunSync: () => void;
  syncing: boolean;
}) {
  const week = useAsync<EmployeeWeek>(() => api.getEmployeeWeek(personId), [personId]);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function submitDecision(run: () => Promise<EmployeeWeek>, successMessage: string) {
    setSubmitting(true);
    setActionError(null);
    try {
      const updated = await run();
      week.setData(updated);
      setEditing(false);
      setFlash(successMessage);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  const confirm = () =>
    submitDecision(() => api.confirmWeek(personId), "Week confirmed. Your manager can now see your response.");

  const correct = (allocations: CorrectedAllocationInput[], comment: string) =>
    submitDecision(
      () => api.correctWeek(personId, allocations, comment || undefined),
      "Correction saved. It is stored in the database and will survive a refresh.",
    );

  if (week.loading) return <LoadingState label="Loading your week…" />;
  if (week.error) {
    // A 404 here means sync has not run for this week yet — an expected
    // starting state for a fresh demo, not a failure.
    const notSynced = week.error.includes("No verification found");
    return notSynced ? (
      <EmptyState
        title="No verification for this week yet"
        message="Run a sync to pull the latest allocation, Jira and calendar signals."
        actionLabel="Run sync"
        onAction={onRunSync}
        busy={syncing}
      />
    ) : (
      <ErrorState message={week.error} onRetry={week.refetch} />
    );
  }
  if (!week.data) return null;

  const data = week.data;
  const awaiting = data.verification.reviewStatus === "AWAITING_CONFIRMATION";

  return (
    <>
      <PageHeader
        title="My Week"
        subtitle={`${data.person.name}${data.person.role ? ` · ${data.person.role}` : ""}`}
        meta={
          <>
            {formatWeek(data.verification.weekStart)}
            <br />
            <button type="button" className="btn-link" onClick={week.refetch}>
              Refresh from server
            </button>
          </>
        }
      />

      {flash && (
        <div className="callout callout-ok" style={{ marginBottom: 16 }}>
          {flash}
        </div>
      )}

      <WeekDetail
        week={data}
        isSelf
        footer={
          editing ? (
            <Card title="Correct my allocation">
              <CorrectionEditor
                week={data}
                submitting={submitting}
                error={actionError}
                onCancel={() => {
                  setEditing(false);
                  setActionError(null);
                }}
                onSubmit={correct}
              />
            </Card>
          ) : (
            <Card
              title={awaiting ? "Your response" : "Update your response"}
              subtitle={
                awaiting
                  ? "Confirm the week if the plan reflects reality, or correct it if it does not."
                  : "You can revise your response if something changed."
              }
            >
              {actionError && <p className="form-error" style={{ marginTop: 0, marginBottom: 12 }}>{actionError}</p>}
              <div className="actions">
                <button type="button" className="btn btn-primary" onClick={confirm} disabled={submitting}>
                  {submitting ? "Saving…" : "Confirm week"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditing(true);
                    setFlash(null);
                  }}
                  disabled={submitting}
                >
                  Correct allocation
                </button>
              </div>
            </Card>
          )
        }
      />
    </>
  );
}
