import type { AnalysisStatus, Confidence, ReviewStatus } from "../api/types";

type Tone = "danger" | "warn" | "ok" | "info" | "neutral";

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const ANALYSIS_PRESENTATION: Record<AnalysisStatus, { tone: Tone; label: string }> = {
  MISMATCH: { tone: "danger", label: "Mismatch" },
  CONSISTENT: { tone: "ok", label: "Consistent" },
  LOW_EVIDENCE: { tone: "neutral", label: "Low evidence" },
};

const REVIEW_PRESENTATION: Record<ReviewStatus, { tone: Tone; label: string }> = {
  AWAITING_CONFIRMATION: { tone: "warn", label: "Awaiting confirmation" },
  CONFIRMED: { tone: "ok", label: "Confirmed" },
  CORRECTED: { tone: "info", label: "Corrected" },
};

export function AnalysisBadge({ status }: { status: AnalysisStatus | null }) {
  if (!status) return <span className="badge badge-neutral">Not analysed</span>;
  const presentation = ANALYSIS_PRESENTATION[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={presentation.tone}>{presentation.label}</Badge>;
}

export function ReviewBadge({ status }: { status: ReviewStatus | null }) {
  if (!status) return <span className="badge badge-neutral">—</span>;
  const presentation = REVIEW_PRESENTATION[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={presentation.tone}>{presentation.label}</Badge>;
}

/** Confidence is evidence quality, not a probability — kept visually quieter than status. */
export function ConfidenceBadge({ confidence }: { confidence: Confidence | null }) {
  if (!confidence) return null;
  return <span className="badge badge-outline">{confidence} confidence</span>;
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <span className="avatar">{initials}</span>;
}
