import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  executiveSummary,
  executiveSummaryAfterCorrection,
  jordanLowEvidenceWeek,
  managerExceptions,
  managerExceptionsAfterCorrection,
  priyaConfirmedWeek,
  priyaCorrectedWeek,
  priyaMismatchWeek,
  PRIYA_ID,
} from "./test/fixtures";

vi.mock("./api/client", () => ({
  api: {
    sync: vi.fn(),
    getEmployeeWeek: vi.fn(),
    confirmWeek: vi.fn(),
    correctWeek: vi.fn(),
    getManagerExceptions: vi.fn(),
    getManagerPersonWeek: vi.fn(),
    getExecutiveSummary: vi.fn(),
  },
  ApiClientError: class ApiClientError extends Error {},
}));

const { api } = await import("./api/client");
const mocked = vi.mocked(api);

/** Puts every endpoint in the pre-decision state the demo starts from. */
function givenFreshlySyncedState() {
  mocked.getManagerExceptions.mockResolvedValue(managerExceptions);
  mocked.getExecutiveSummary.mockResolvedValue(executiveSummary);
  mocked.getEmployeeWeek.mockResolvedValue(priyaMismatchWeek);
  mocked.getManagerPersonWeek.mockResolvedValue(priyaMismatchWeek);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
  givenFreshlySyncedState();
});

afterEach(cleanup);

async function switchPersona(persona: "Employee" | "Manager" | "Executive") {
  // The sidebar only mounts once the roster bootstrap resolves.
  const switcher = await screen.findByRole("group", { name: "Viewing as" });
  await userEvent.click(within(switcher).getByRole("button", { name: persona }));
}

/** "Corrected" is both a KPI label and a status badge, so scope to the KPI card. */
function kpiValue(label: string): string {
  const labelElement = screen.getAllByText(label).find((element) => element.classList.contains("kpi-label"));
  return labelElement?.parentElement?.querySelector(".kpi-value")?.textContent ?? "";
}

function rowFor(name: string): HTMLElement {
  return screen.getByText(name).closest("button") as HTMLElement;
}

describe("persona switching", () => {
  it("lands on the Executive view by default", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Resource Health" })).toBeTruthy();
  });

  it("changes navigation, landing page and available actions per persona", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Resource Health" });

    await switchPersona("Manager");
    expect(await screen.findByRole("heading", { name: "Team Verification" })).toBeTruthy();
    // A manager reviews; only the employee can respond to a finding.
    expect(screen.queryByRole("button", { name: "Confirm week" })).toBeNull();

    await switchPersona("Employee");
    expect(await screen.findByRole("heading", { name: "My Week" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm week" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Correct allocation" })).toBeTruthy();
  });

  it("binds the Employee persona to Priya Shah", async () => {
    render(<App />);
    await switchPersona("Employee");

    await screen.findByRole("heading", { name: "My Week" });
    expect(mocked.getEmployeeWeek).toHaveBeenCalledWith(PRIYA_ID);
  });
});

describe("employee mismatch rendering", () => {
  it("shows the machine analysis, confidence and the deterministic reason", async () => {
    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });

    expect(screen.getByText("Possible allocation mismatch")).toBeTruthy();
    expect(screen.getByText("Mismatch")).toBeTruthy();
    expect(screen.getByText("HIGH confidence")).toBeTruthy();
    expect(screen.getByText(/Awaiting confirmation/)).toBeTruthy();
    expect(screen.getByText(priyaMismatchWeek.verification.reason)).toBeTruthy();
  });

  it("shows planned vs observed and flags Beacon as outside the plan", async () => {
    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });

    expect(screen.getByText("75%")).toBeTruthy(); // planned Atlas
    expect(screen.getByText("89%")).toBeTruthy(); // observed Beacon
    expect(screen.getByText("Not in plan")).toBeTruthy();
  });

  it("shows per-source evidence in human units", async () => {
    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });

    expect(screen.getByText("9 issues")).toBeTruthy();
    expect(screen.getByText("7 hours")).toBeTruthy();
  });
});

describe("confirm", () => {
  it("persists a confirmation and reflects it in the review state", async () => {
    mocked.confirmWeek.mockResolvedValue(priyaConfirmedWeek);

    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });

    await userEvent.click(screen.getByRole("button", { name: "Confirm week" }));

    await waitFor(() => expect(mocked.confirmWeek).toHaveBeenCalledWith(PRIYA_ID));
    // Shown both in the verdict panel and the recorded-decision card.
    expect((await screen.findAllByText("Confirmed")).length).toBeGreaterThan(0);
    // The machine's finding is not rewritten by the human response.
    expect(screen.getByText("Mismatch")).toBeTruthy();
  });
});

describe("correct", () => {
  it("submits the corrected allocation and keeps the machine analysis unchanged", async () => {
    mocked.correctWeek.mockResolvedValue(priyaCorrectedWeek);

    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });

    await userEvent.click(screen.getByRole("button", { name: "Correct allocation" }));

    await userEvent.type(screen.getByLabelText("Project Atlas percentage"), "30");
    await userEvent.type(screen.getByLabelText("Project Beacon percentage"), "50");
    await userEvent.type(screen.getByLabelText("Project Cedar percentage"), "20");
    await userEvent.click(screen.getByRole("button", { name: "Save correction" }));

    await waitFor(() => expect(mocked.correctWeek).toHaveBeenCalled());
    const [personId, allocations] = mocked.correctWeek.mock.calls[0];
    expect(personId).toBe(PRIYA_ID);
    expect(allocations).toHaveLength(3);
    expect(allocations.reduce((sum, entry) => sum + entry.percentage, 0)).toBe(100);

    expect((await screen.findAllByText("Corrected")).length).toBeGreaterThan(0);
    expect(screen.getByText("Mismatch")).toBeTruthy();
  });

  it("blocks a submission whose total exceeds 100%", async () => {
    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });
    await userEvent.click(screen.getByRole("button", { name: "Correct allocation" }));

    await userEvent.type(screen.getByLabelText("Project Atlas percentage"), "80");
    await userEvent.type(screen.getByLabelText("Project Beacon percentage"), "40");

    expect(screen.getByRole("button", { name: "Save correction" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/must not exceed 100%/)).toBeTruthy();
    expect(mocked.correctWeek).not.toHaveBeenCalled();
  });

  it("surfaces an API validation error instead of silently failing", async () => {
    mocked.correctWeek.mockRejectedValue(new Error("Unknown project ID: nope"));

    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });
    await userEvent.click(screen.getByRole("button", { name: "Correct allocation" }));
    await userEvent.type(screen.getByLabelText("Project Atlas percentage"), "30");
    await userEvent.click(screen.getByRole("button", { name: "Save correction" }));

    expect(await screen.findByText("Unknown project ID: nope")).toBeTruthy();
  });
});

describe("correction persistence", () => {
  it("still shows the correction after re-fetching from the server", async () => {
    mocked.correctWeek.mockResolvedValue(priyaCorrectedWeek);

    render(<App />);
    await switchPersona("Employee");
    await screen.findByRole("heading", { name: "My Week" });
    await userEvent.click(screen.getByRole("button", { name: "Correct allocation" }));
    await userEvent.type(screen.getByLabelText("Project Beacon percentage"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Save correction" }));
    await screen.findAllByText("Corrected");

    // Simulate the demo's "prove it persisted" step: the server is now the
    // only source of truth for the reloaded view.
    mocked.getEmployeeWeek.mockResolvedValue(priyaCorrectedWeek);
    await userEvent.click(screen.getByRole("button", { name: "Refresh from server" }));

    await waitFor(() => expect(mocked.getEmployeeWeek).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("Corrected")).length).toBeGreaterThan(0);
    expect(screen.getByText("I spent more time on Project Beacon this week.")).toBeTruthy();
  });
});

describe("manager exception view", () => {
  it("prioritises the mismatch and low-evidence people", async () => {
    render(<App />);
    await switchPersona("Manager");
    await screen.findByRole("heading", { name: "Team Verification" });

    expect(within(rowFor("Priya Shah")).getByText("Mismatch")).toBeTruthy();
    expect(within(rowFor("Jordan Lee")).getByText("Low evidence")).toBeTruthy();
    expect(kpiValue("Mismatches")).toBe("1");
    expect(kpiValue("Low evidence")).toBe("1");
  });

  it("opens a read-only drill-down for a person", async () => {
    render(<App />);
    await switchPersona("Manager");
    await screen.findByRole("heading", { name: "Team Verification" });

    await userEvent.click(screen.getByText("Priya Shah"));

    expect(await screen.findByRole("heading", { name: "Priya Shah" })).toBeTruthy();
    expect(mocked.getManagerPersonWeek).toHaveBeenCalledWith(PRIYA_ID);
    expect(screen.queryByRole("button", { name: "Confirm week" })).toBeNull();
    expect(screen.getByText("Employee review")).toBeTruthy();
  });

  it("keeps only true anomalies in Needs attention, not merely-unconfirmed people", async () => {
    render(<App />);
    await switchPersona("Manager");
    await screen.findByRole("heading", { name: "Team Verification" });

    const attention = screen.getByRole("heading", { name: "Needs attention" }).closest("section") as HTMLElement;
    expect(within(attention).getByText("Priya Shah")).toBeTruthy();
    expect(within(attention).getByText("Jordan Lee")).toBeTruthy();
    // Consistent people who simply have not replied are not exceptions.
    expect(within(attention).queryByText("Maya Chen")).toBeNull();

    const awaiting = screen
      .getByRole("heading", { name: "Awaiting confirmation" })
      .closest("section") as HTMLElement;
    expect(within(awaiting).getByText("Maya Chen")).toBeTruthy();
    expect(within(awaiting).getByText("Elena Garcia")).toBeTruthy();
    expect(within(awaiting).getByText("Marcus Reed")).toBeTruthy();
  });

  it("does not assert a project-level verdict for a low-evidence week", async () => {
    mocked.getManagerPersonWeek.mockResolvedValue(jordanLowEvidenceWeek);

    render(<App />);
    await switchPersona("Manager");
    await screen.findByRole("heading", { name: "Team Verification" });
    await userEvent.click(screen.getByText("Jordan Lee"));

    await screen.findByRole("heading", { name: "Jordan Lee" });
    expect(screen.getByText("Insufficient evidence")).toBeTruthy();
    // 100% planned vs 100% observed is an artifact of two signals, not agreement.
    expect(screen.queryByText("On plan")).toBeNull();
  });

  it("reflects a persisted correction", async () => {
    mocked.getManagerExceptions.mockResolvedValue(managerExceptionsAfterCorrection);

    render(<App />);
    await switchPersona("Manager");
    await screen.findByRole("heading", { name: "Team Verification" });

    expect(within(rowFor("Priya Shah")).getByText("Corrected")).toBeTruthy();
    expect(kpiValue("Corrected")).toBe("1");
  });
});

describe("executive summary view", () => {
  it("renders the headline health, KPIs and needs-attention list", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Resource Health" });

    // Wording must cover low-evidence cases too, which are not "issues".
    expect(screen.getByText("2 resource checks need attention")).toBeTruthy();
    expect(screen.getByText("1 allocation mismatch requires review")).toBeTruthy();
    expect(screen.getByText("1 person has insufficient activity evidence")).toBeTruthy();
    expect(screen.getByText("Employee-adjusted allocations")).toBeTruthy();
  });

  it("reflects verified and corrected counts after a correction", async () => {
    mocked.getExecutiveSummary.mockResolvedValue(executiveSummaryAfterCorrection);
    mocked.getManagerExceptions.mockResolvedValue(managerExceptionsAfterCorrection);

    render(<App />);
    await screen.findByRole("heading", { name: "Resource Health" });

    expect(kpiValue("Verified")).toBe("1");
    expect(kpiValue("Corrected")).toBe("1");
    expect(kpiValue("Awaiting review")).toBe("4");
  });

  it("lets an executive drill into a person behind a finding", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Resource Health" });

    await userEvent.click(screen.getByText("Priya Shah"));

    expect(await screen.findByRole("heading", { name: "Priya Shah" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirm week" })).toBeNull();
  });
});

describe("sync", () => {
  it("runs a sync and reloads persisted state", async () => {
    mocked.sync.mockResolvedValue({
      weekStart: "2026-08-10",
      signalsProcessed: 27,
      peopleAnalyzed: 5,
      results: [],
    });

    render(<App />);
    await screen.findByRole("heading", { name: "Resource Health" });

    await userEvent.click(screen.getByRole("button", { name: "Run sync" }));

    await waitFor(() => expect(mocked.sync).toHaveBeenCalled());
    await waitFor(() => expect(mocked.getExecutiveSummary.mock.calls.length).toBeGreaterThan(1));
  });
});
