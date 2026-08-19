import type { EmployeeWeek, EvidenceItem } from "../api/types";

type SourceKey = keyof EmployeeWeek["evidence"];

const SOURCE_LABELS: Record<SourceKey, string> = {
  allocation: "Planned allocation",
  jira: "Jira activity",
  calendar: "Calendar activity",
};

/** Turns a raw quantity into the unit that source actually measures. */
function describeQuantity(source: SourceKey, quantity: number): string {
  if (source === "allocation") return `${Math.round(quantity)}% planned`;
  if (source === "jira") return `${quantity} ${quantity === 1 ? "issue" : "issues"}`;
  return `${quantity} ${quantity === 1 ? "hour" : "hours"}`;
}

function Column({ source, items }: { source: SourceKey; items: EvidenceItem[] }) {
  const sorted = [...items].sort((a, b) => b.quantity - a.quantity);

  return (
    <div className="evidence-col">
      <div className="evidence-source">{SOURCE_LABELS[source]}</div>
      {sorted.length === 0 ? (
        <p className="evidence-empty">No activity recorded</p>
      ) : (
        sorted.map((item) => (
          <div className="evidence-item" key={`${source}-${item.projectId}`}>
            <span>{item.projectName}</span>
            <span className="evidence-qty">{describeQuantity(source, item.quantity)}</span>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Shows what each independent source actually reported, so a human can judge
 * the system's conclusion rather than take it on trust.
 */
export function EvidencePanel({ evidence }: { evidence: EmployeeWeek["evidence"] }) {
  return (
    <div className="evidence-grid">
      <Column source="allocation" items={evidence.allocation} />
      <Column source="jira" items={evidence.jira} />
      <Column source="calendar" items={evidence.calendar} />
    </div>
  );
}
