import type { DistributionEntry } from "../api/types";

interface ComparisonRow {
  projectId: string;
  projectName: string;
  planned: number;
  observed: number;
  delta: number;
}

/**
 * Presentation-only join of the two distributions the backend already
 * computed. No verification logic lives here — the engine's status,
 * confidence and reason are the authoritative outputs; this just makes the
 * numbers readable at a glance.
 */
export function buildComparison(
  planned: DistributionEntry[],
  observed: DistributionEntry[],
): ComparisonRow[] {
  const byId = new Map<string, ComparisonRow>();

  const ensure = (entry: DistributionEntry): ComparisonRow => {
    const existing = byId.get(entry.projectId);
    if (existing) return existing;
    const created = {
      projectId: entry.projectId,
      projectName: entry.projectName,
      planned: 0,
      observed: 0,
      delta: 0,
    };
    byId.set(entry.projectId, created);
    return created;
  };

  for (const entry of planned) ensure(entry).planned = entry.percentage;
  for (const entry of observed) ensure(entry).observed = entry.percentage;

  return [...byId.values()]
    .map((row) => ({ ...row, delta: row.observed - row.planned }))
    .sort((a, b) => Math.max(b.planned, b.observed) - Math.max(a.planned, a.observed));
}

function rowFlag(row: ComparisonRow) {
  if (row.planned === 0 && row.observed > 0) {
    return <span className="badge badge-danger">Not in plan</span>;
  }
  if (row.observed === 0 && row.planned > 0) {
    return <span className="badge badge-warn">No observed activity</span>;
  }
  if (Math.abs(row.delta) >= 15) {
    const label = row.delta > 0 ? "Above plan" : "Below plan";
    return <span className="badge badge-neutral">{label}</span>;
  }
  return <span className="badge badge-ok">On plan</span>;
}

export function DistributionCompare({
  planned,
  observed,
  lowEvidence = false,
}: {
  planned: DistributionEntry[];
  observed: DistributionEntry[];
  /**
   * When the engine found too little activity to judge, the observed shares
   * are a normalisation artifact of a handful of signals. Showing "On plan"
   * off the back of that would assert a verdict the engine explicitly did
   * not reach, so per-project judgment is suppressed.
   */
  lowEvidence?: boolean;
}) {
  const rows = buildComparison(planned, observed);

  if (rows.length === 0) {
    return <p className="evidence-empty">No allocation or activity recorded for this week.</p>;
  }

  return (
    <div>
      {rows.map((row) => (
        <div className="dist-row" key={row.projectId}>
          <div className="dist-head">
            <span className="dist-name">{row.projectName}</span>
            {lowEvidence ? (
              <span className="badge badge-neutral">Insufficient evidence</span>
            ) : (
              rowFlag(row)
            )}
          </div>

          <div className="dist-bars">
            <span className="dist-bar-label">Planned</span>
            <div className="dist-track">
              <div className="dist-fill planned" style={{ width: `${Math.min(row.planned, 100)}%` }} />
            </div>
            <span className="dist-value">{Math.round(row.planned)}%</span>
          </div>

          <div className="dist-bars">
            <span className="dist-bar-label">Observed</span>
            <div className="dist-track">
              <div className="dist-fill observed" style={{ width: `${Math.min(row.observed, 100)}%` }} />
            </div>
            <span className="dist-value">{Math.round(row.observed)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
