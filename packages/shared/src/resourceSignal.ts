/**
 * Common internal representation that every external source is normalized
 * into (SPEC.md section 10). Downstream code (verification engine, APIs)
 * should depend only on this type, never on source-specific raw shapes.
 */
export type SignalSource = "allocation" | "jira" | "calendar";

export type SignalType = "declared_allocation" | "work_activity" | "meeting_activity";

export interface ResourceSignal {
  personId: string;
  projectId: string;
  source: SignalSource;
  signalType: SignalType;
  quantity: number;
  weekStart: string;
  evidence: Record<string, unknown>;
}
