import type {
  CorrectedAllocationInput,
  EmployeeWeek,
  ExecutiveSummary,
  ManagerExceptions,
  SyncSummary,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

/** Carries the API's own error message so the UI can show something useful. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiClientError(`Could not reach the API at ${BASE_URL}. Is it running (pnpm dev:api)?`);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiClientError(body?.error ?? `Request failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

/**
 * All endpoints treat `weekStart` as optional — the API defaults to the
 * project's demo week, so the UI never has to hard-code it.
 */
export const api = {
  sync: (weekStart?: string) =>
    request<SyncSummary>("/api/sync", { method: "POST", body: JSON.stringify({ weekStart }) }),

  getEmployeeWeek: (personId: string, weekStart?: string) =>
    request<EmployeeWeek>(`/api/employees/${personId}/week${weekStart ? `?weekStart=${weekStart}` : ""}`),

  confirmWeek: (personId: string, comment?: string, weekStart?: string) =>
    request<EmployeeWeek>(`/api/employees/${personId}/week/confirm`, {
      method: "POST",
      body: JSON.stringify({ weekStart, comment }),
    }),

  correctWeek: (
    personId: string,
    allocations: CorrectedAllocationInput[],
    comment?: string,
    weekStart?: string,
  ) =>
    request<EmployeeWeek>(`/api/employees/${personId}/week/correct`, {
      method: "POST",
      body: JSON.stringify({ weekStart, allocations, comment }),
    }),

  getManagerExceptions: (weekStart?: string) =>
    request<ManagerExceptions>(`/api/manager/exceptions${weekStart ? `?weekStart=${weekStart}` : ""}`),

  getManagerPersonWeek: (personId: string, weekStart?: string) =>
    request<EmployeeWeek>(`/api/manager/people/${personId}/week${weekStart ? `?weekStart=${weekStart}` : ""}`),

  getExecutiveSummary: (weekStart?: string) =>
    request<ExecutiveSummary>(`/api/executive/summary${weekStart ? `?weekStart=${weekStart}` : ""}`),
};

export type Api = typeof api;
