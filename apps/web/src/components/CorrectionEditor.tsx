import { useMemo, useState } from "react";
import type { CorrectedAllocationInput, EmployeeWeek } from "../api/types";

interface EditableProject {
  projectId: string;
  projectName: string;
  planned: number;
  observed: number;
}

/**
 * Every project this person has any signal for — the union of what was
 * planned, what was observed, and what the raw evidence mentions. Avoids
 * needing a separate projects endpoint just to populate the form.
 */
function collectProjects(week: EmployeeWeek): EditableProject[] {
  const projects = new Map<string, EditableProject>();

  const ensure = (projectId: string, projectName: string) => {
    if (!projects.has(projectId)) {
      projects.set(projectId, { projectId, projectName, planned: 0, observed: 0 });
    }
    return projects.get(projectId)!;
  };

  for (const entry of week.plannedDistribution) ensure(entry.projectId, entry.projectName).planned = entry.percentage;
  for (const entry of week.observedDistribution) ensure(entry.projectId, entry.projectName).observed = entry.percentage;
  for (const items of Object.values(week.evidence)) {
    for (const item of items) ensure(item.projectId, item.projectName);
  }

  return [...projects.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
}

export function CorrectionEditor({
  week,
  onCancel,
  onSubmit,
  submitting,
  error,
}: {
  week: EmployeeWeek;
  onCancel: () => void;
  onSubmit: (allocations: CorrectedAllocationInput[], comment: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const projects = useMemo(() => collectProjects(week), [week]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");

  const allocations: CorrectedAllocationInput[] = projects
    .map((project) => ({ projectId: project.projectId, percentage: Number(values[project.projectId] ?? "") }))
    // Only projects the person actually assigned time to are submitted; the
    // API rejects zero/blank percentages by design.
    .filter((entry) => Number.isFinite(entry.percentage) && entry.percentage > 0);

  const total = allocations.reduce((sum, entry) => sum + entry.percentage, 0);
  const hasInvalidNumber = projects.some((project) => {
    const raw = values[project.projectId];
    if (raw === undefined || raw === "") return false;
    const parsed = Number(raw);
    return !Number.isFinite(parsed) || parsed < 0 || parsed > 100;
  });

  const overAllocated = total > 100;
  const canSubmit = allocations.length > 0 && !overAllocated && !hasInvalidNumber && !submitting;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(allocations, comment.trim());
      }}
    >
      <p className="page-subtitle" style={{ marginBottom: 12 }}>
        Enter the share of your week each project actually took. Leave a project blank if you did not work on it.
      </p>

      {projects.map((project) => (
        <div className="correction-row" key={project.projectId}>
          <div>
            <label className="form-label" htmlFor={`alloc-${project.projectId}`} style={{ marginBottom: 2 }}>
              {project.projectName}
            </label>
            <div className="correction-hint">
              Planned {Math.round(project.planned)}% · Observed {Math.round(project.observed)}%
            </div>
          </div>
          <input
            id={`alloc-${project.projectId}`}
            className="input"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            placeholder="0"
            aria-label={`${project.projectName} percentage`}
            value={values[project.projectId] ?? ""}
            onChange={(event) =>
              setValues((current) => ({ ...current, [project.projectId]: event.target.value }))
            }
          />
        </div>
      ))}

      <div className={`correction-total${overAllocated ? " invalid" : ""}`}>
        <span>Total allocated</span>
        <span>{total}% {overAllocated ? "— must not exceed 100%" : ""}</span>
      </div>

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <label className="form-label" htmlFor="correction-comment">
          Comment (optional)
        </label>
        <input
          id="correction-comment"
          className="input"
          type="text"
          placeholder="Why did the week differ from the plan?"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? "Saving…" : "Save correction"}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
