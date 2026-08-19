import type { EmployeeWeek, ExecutiveSummary, ManagerExceptions } from "../api/types";

/**
 * Mirrors the real values the seeded demo data produces, so the tests assert
 * against the same numbers a stakeholder sees in the live demo.
 */
export const ATLAS = "22222222-2222-4222-8222-222222222201";
export const BEACON = "22222222-2222-4222-8222-222222222202";
export const CEDAR = "22222222-2222-4222-8222-222222222203";

export const PRIYA_ID = "11111111-1111-4111-8111-111111111103";
export const JORDAN_ID = "11111111-1111-4111-8111-111111111102";
export const MAYA_ID = "11111111-1111-4111-8111-111111111101";

export const priyaMismatchWeek: EmployeeWeek = {
  person: { id: PRIYA_ID, name: "Priya Shah", role: "Senior Software Engineer", department: "Engineering" },
  verification: {
    weekStart: "2026-08-10",
    analysisStatus: "MISMATCH",
    confidence: "HIGH",
    reviewStatus: "AWAITING_CONFIRMATION",
    reason:
      "Observed activity is concentrated on Project Beacon while the declared allocation is concentrated on Project Atlas.",
    distributionGap: 89.13,
  },
  plannedDistribution: [
    { projectId: ATLAS, projectName: "Project Atlas", percentage: 75 },
    { projectId: CEDAR, projectName: "Project Cedar", percentage: 25 },
  ],
  observedDistribution: [
    { projectId: ATLAS, projectName: "Project Atlas", percentage: 10.88 },
    { projectId: BEACON, projectName: "Project Beacon", percentage: 89.13 },
  ],
  evidence: {
    allocation: [
      { projectId: ATLAS, projectName: "Project Atlas", quantity: 60, evidence: {} },
      { projectId: CEDAR, projectName: "Project Cedar", quantity: 20, evidence: {} },
    ],
    jira: [
      { projectId: ATLAS, projectName: "Project Atlas", quantity: 1, evidence: {} },
      { projectId: BEACON, projectName: "Project Beacon", quantity: 9, evidence: {} },
    ],
    calendar: [
      { projectId: ATLAS, projectName: "Project Atlas", quantity: 1, evidence: {} },
      { projectId: BEACON, projectName: "Project Beacon", quantity: 7, evidence: {} },
    ],
  },
  humanReview: null,
};

/** What the API returns after Priya submits Atlas 30 / Beacon 50 / Cedar 20. */
export const priyaCorrectedWeek: EmployeeWeek = {
  ...priyaMismatchWeek,
  verification: { ...priyaMismatchWeek.verification, reviewStatus: "CORRECTED" },
  humanReview: {
    decision: "CORRECT",
    comment: "I spent more time on Project Beacon this week.",
    correctedAllocations: [
      { projectId: ATLAS, projectName: "Project Atlas", percentage: 30 },
      { projectId: BEACON, projectName: "Project Beacon", percentage: 50 },
      { projectId: CEDAR, projectName: "Project Cedar", percentage: 20 },
    ],
    decidedAt: "2026-08-18T19:20:02.854Z",
  },
};

export const priyaConfirmedWeek: EmployeeWeek = {
  ...priyaMismatchWeek,
  verification: { ...priyaMismatchWeek.verification, reviewStatus: "CONFIRMED" },
  humanReview: {
    decision: "CONFIRM",
    comment: null,
    correctedAllocations: null,
    decidedAt: "2026-08-18T19:20:02.854Z",
  },
};

export const managerExceptions: ManagerExceptions = {
  weekStart: "2026-08-10",
  summary: {
    peopleTracked: 5,
    awaitingConfirmation: 5,
    confirmed: 0,
    corrected: 0,
    mismatch: 1,
    lowEvidence: 1,
  },
  people: [
    {
      personId: "11111111-1111-4111-8111-111111111105",
      name: "Elena Garcia",
      role: "Software Engineer",
      department: "Engineering",
      analysisStatus: "CONSISTENT",
      confidence: "HIGH",
      reviewStatus: "AWAITING_CONFIRMATION",
      reason: "Observed activity is concentrated on projects included in the declared allocation.",
    },
    {
      personId: JORDAN_ID,
      name: "Jordan Lee",
      role: "Software Engineer",
      department: "Engineering",
      analysisStatus: "LOW_EVIDENCE",
      confidence: "LOW",
      reviewStatus: "AWAITING_CONFIRMATION",
      reason:
        "Not enough Jira or Calendar activity was found to confidently compare observed work with the declared allocation.",
    },
    {
      personId: "11111111-1111-4111-8111-111111111104",
      name: "Marcus Reed",
      role: "Software Engineer",
      department: "Engineering",
      analysisStatus: "CONSISTENT",
      confidence: "HIGH",
      reviewStatus: "AWAITING_CONFIRMATION",
      reason: "Observed activity is concentrated on projects included in the declared allocation.",
    },
    {
      personId: MAYA_ID,
      name: "Maya Chen",
      role: "Software Engineer",
      department: "Engineering",
      analysisStatus: "CONSISTENT",
      confidence: "HIGH",
      reviewStatus: "AWAITING_CONFIRMATION",
      reason: "Observed activity is concentrated on projects included in the declared allocation.",
    },
    {
      personId: PRIYA_ID,
      name: "Priya Shah",
      role: "Senior Software Engineer",
      department: "Engineering",
      analysisStatus: "MISMATCH",
      confidence: "HIGH",
      reviewStatus: "AWAITING_CONFIRMATION",
      reason:
        "Observed activity is concentrated on Project Beacon while the declared allocation is concentrated on Project Atlas.",
    },
  ],
};

export const managerExceptionsAfterCorrection: ManagerExceptions = {
  ...managerExceptions,
  summary: { ...managerExceptions.summary, awaitingConfirmation: 4, corrected: 1 },
  people: managerExceptions.people.map((person) =>
    person.personId === PRIYA_ID ? { ...person, reviewStatus: "CORRECTED" as const } : person,
  ),
};

export const executiveSummary: ExecutiveSummary = {
  peopleTracked: 5,
  verifiedCount: 0,
  awaitingConfirmationCount: 5,
  mismatchCount: 1,
  lowEvidenceCount: 1,
  correctedCount: 0,
  projectsTracked: 3,
  needsAttention: [
    "1 allocation mismatch requires review",
    "1 person has insufficient activity evidence",
    "5 people have not confirmed their week",
  ],
};

export const executiveSummaryAfterCorrection: ExecutiveSummary = {
  ...executiveSummary,
  verifiedCount: 1,
  correctedCount: 1,
  awaitingConfirmationCount: 4,
  needsAttention: [
    "1 allocation mismatch requires review",
    "1 person has insufficient activity evidence",
    "4 people have not confirmed their week",
  ],
};
