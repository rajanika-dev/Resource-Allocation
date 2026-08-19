import type { ReactNode } from "react";
import type { EmployeeWeek } from "../api/types";
import { AnalysisBadge, ConfidenceBadge, ReviewBadge } from "./badges";
import { DistributionCompare } from "./DistributionCompare";
import { EvidencePanel } from "./EvidencePanel";
import { Card } from "./primitives";

function headlineCallout(week: EmployeeWeek, isSelf: boolean) {
  const { analysisStatus, reason } = week.verification;
  const subject = isSelf ? "your" : "their";

  if (analysisStatus === "MISMATCH") {
    return (
      <div className="callout callout-danger">
        <div className="callout-title">Possible allocation mismatch</div>
        {reason}
      </div>
    );
  }
  if (analysisStatus === "LOW_EVIDENCE") {
    return (
      <div className="callout callout-warn">
        <div className="callout-title">Not enough evidence to verify</div>
        {reason}
      </div>
    );
  }
  return (
    <div className="callout callout-ok">
      <div className="callout-title">Observed work matches the plan</div>
      {reason} No action needed beyond confirming {subject} week.
    </div>
  );
}

/**
 * The one detailed view of a person's week, shared by the Employee screen and
 * the Manager/Executive drill-downs. `footer` is where the Employee persona
 * injects its Confirm/Correct actions; review personas pass nothing, which is
 * what makes their experience read-only.
 */
export function WeekDetail({
  week,
  isSelf,
  footer,
}: {
  week: EmployeeWeek;
  isSelf: boolean;
  footer?: ReactNode;
}) {
  const { verification, humanReview } = week;
  const isLowEvidence = verification.analysisStatus === "LOW_EVIDENCE";

  return (
    <div className="stack">
      {headlineCallout(week, isSelf)}

      <Card bodyless>
        <div className="verdict">
          <div className="verdict-pane">
            <div className="verdict-label">Machine analysis</div>
            <div className="verdict-value">
              <AnalysisBadge status={verification.analysisStatus} />
              <ConfidenceBadge confidence={verification.confidence} />
            </div>
            <p className="verdict-note">
              Determined from Jira and calendar activity against the declared plan. This finding does not
              change when a person responds to it.
            </p>
          </div>

          <div className="verdict-pane">
            <div className="verdict-label">{isSelf ? "Your review" : "Employee review"}</div>
            <div className="verdict-value">
              <ReviewBadge status={verification.reviewStatus} />
            </div>
            <p className="verdict-note">
              {verification.reviewStatus === "AWAITING_CONFIRMATION"
                ? isSelf
                  ? "Confirm the week as-is, or correct the allocation below."
                  : "This person has not yet responded to the finding."
                : `Recorded${humanReview ? ` on ${new Date(humanReview.decidedAt).toLocaleString("en-GB")}` : ""}.`}
            </p>
          </div>
        </div>
      </Card>

      <Card
        title="Planned vs observed"
        subtitle={
          isLowEvidence
            ? "Share of the week per project — too little activity to draw a conclusion"
            : "Share of the week per project"
        }
      >
        <DistributionCompare
          planned={week.plannedDistribution}
          observed={week.observedDistribution}
          lowEvidence={isLowEvidence}
        />
      </Card>

      <Card title="Source evidence" subtitle="What each independent source reported" bodyless>
        <EvidencePanel evidence={week.evidence} />
      </Card>

      {humanReview && (
        <Card title={isSelf ? "Your recorded decision" : "Employee decision"}>
          <div className="verdict-value" style={{ marginBottom: 10 }}>
            <ReviewBadge status={verification.reviewStatus} />
            <span className="card-meta">
              {new Date(humanReview.decidedAt).toLocaleString("en-GB")}
            </span>
          </div>

          {humanReview.correctedAllocations && humanReview.correctedAllocations.length > 0 && (
            <div style={{ marginBottom: humanReview.comment ? 12 : 0 }}>
              <div className="evidence-source">Corrected allocation</div>
              {humanReview.correctedAllocations.map((allocation) => (
                <div className="evidence-item" key={allocation.projectId}>
                  <span>{allocation.projectName}</span>
                  <span className="evidence-qty">{allocation.percentage}%</span>
                </div>
              ))}
            </div>
          )}

          {humanReview.comment && (
            <div>
              <div className="evidence-source">Comment</div>
              <p>{humanReview.comment}</p>
            </div>
          )}
        </Card>
      )}

      {footer}
    </div>
  );
}
