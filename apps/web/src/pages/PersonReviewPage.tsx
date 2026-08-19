import { api } from "../api/client";
import type { EmployeeWeek } from "../api/types";
import { ErrorState, LoadingState, PageHeader, formatWeek } from "../components/primitives";
import { WeekDetail } from "../components/WeekDetail";
import { useAsync } from "../hooks/useAsync";

/**
 * Read-only drill-down used by the Manager and Executive personas. It renders
 * the same detail as the Employee screen but offers no Confirm/Correct —
 * responding to a finding is the employee's action alone.
 */
export function PersonReviewPage({
  personId,
  backLabel,
  onBack,
}: {
  personId: string;
  backLabel: string;
  onBack: () => void;
}) {
  const week = useAsync<EmployeeWeek>(() => api.getManagerPersonWeek(personId), [personId]);

  if (week.loading) return <LoadingState />;
  if (week.error) return <ErrorState message={week.error} onRetry={week.refetch} />;
  if (!week.data) return null;

  const data = week.data;

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        ← {backLabel}
      </button>

      <PageHeader
        title={data.person.name}
        subtitle={[data.person.role, data.person.department].filter(Boolean).join(" · ")}
        meta={
          <>
            {formatWeek(data.verification.weekStart)}
            <br />
            <button type="button" className="btn-link" onClick={week.refetch}>
              Refresh
            </button>
          </>
        }
      />

      <WeekDetail week={data} isSelf={false} />
    </>
  );
}
