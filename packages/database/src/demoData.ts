/**
 * Deterministic fake demo data for the Resource Verification MVP.
 * IDs are fixed constants (not randomly generated) so that seeding is
 * idempotent and `demo:reset` always restores the exact same state.
 * All names/emails are fictional, per SPEC.md section 6.
 */

export const DEMO_WEEK_START = "2026-08-10";

export const PEOPLE_IDS = {
  mayaChen: "11111111-1111-4111-8111-111111111101",
  jordanLee: "11111111-1111-4111-8111-111111111102",
  priyaShah: "11111111-1111-4111-8111-111111111103",
  marcusReed: "11111111-1111-4111-8111-111111111104",
  elenaGarcia: "11111111-1111-4111-8111-111111111105",
} as const;

export const PROJECT_IDS = {
  atlas: "22222222-2222-4222-8222-222222222201",
  beacon: "22222222-2222-4222-8222-222222222202",
  cedar: "22222222-2222-4222-8222-222222222203",
} as const;

export const demoPeople = [
  {
    id: PEOPLE_IDS.mayaChen,
    name: "Maya Chen",
    email: "maya.chen@example.test",
    managerId: null,
    department: "Engineering",
    role: "Software Engineer",
    weeklyCapacityHours: 40,
  },
  {
    id: PEOPLE_IDS.jordanLee,
    name: "Jordan Lee",
    email: "jordan.lee@example.test",
    managerId: null,
    department: "Engineering",
    role: "Software Engineer",
    weeklyCapacityHours: 40,
  },
  {
    id: PEOPLE_IDS.priyaShah,
    name: "Priya Shah",
    email: "priya.shah@example.test",
    managerId: null,
    department: "Engineering",
    role: "Senior Software Engineer",
    weeklyCapacityHours: 40,
  },
  {
    id: PEOPLE_IDS.marcusReed,
    name: "Marcus Reed",
    email: "marcus.reed@example.test",
    managerId: null,
    department: "Engineering",
    role: "Software Engineer",
    weeklyCapacityHours: 40,
  },
  {
    id: PEOPLE_IDS.elenaGarcia,
    name: "Elena Garcia",
    email: "elena.garcia@example.test",
    managerId: null,
    department: "Engineering",
    role: "Software Engineer",
    weeklyCapacityHours: 40,
  },
];

export const demoProjects = [
  { id: PROJECT_IDS.atlas, name: "Project Atlas", status: "active" },
  { id: PROJECT_IDS.beacon, name: "Project Beacon", status: "active" },
  { id: PROJECT_IDS.cedar, name: "Project Cedar", status: "active" },
];

/**
 * Planned allocations for the demo week. Percentages intentionally do not
 * always sum to 100 — remaining capacity is unallocated/internal, per
 * SPEC.md section 7. These support the future Priya mismatch demo (section
 * 7/8); the actual mismatch/consistent determination is computed later by
 * the verification engine from observed activity signals, not seeded here.
 */
export const demoPlannedAllocations = [
  // Maya Chen — planned/observed will agree (CONSISTENT case).
  { personId: PEOPLE_IDS.mayaChen, projectId: PROJECT_IDS.atlas, percentage: "50.00" },
  { personId: PEOPLE_IDS.mayaChen, projectId: PROJECT_IDS.beacon, percentage: "30.00" },

  // Jordan Lee — sparse allocation supports a LOW_EVIDENCE case.
  { personId: PEOPLE_IDS.jordanLee, projectId: PROJECT_IDS.cedar, percentage: "40.00" },

  // Priya Shah — primary MISMATCH demo case (SPEC.md section 7).
  { personId: PEOPLE_IDS.priyaShah, projectId: PROJECT_IDS.atlas, percentage: "60.00" },
  { personId: PEOPLE_IDS.priyaShah, projectId: PROJECT_IDS.cedar, percentage: "20.00" },

  // Marcus Reed — planned/observed will agree (CONSISTENT case).
  { personId: PEOPLE_IDS.marcusReed, projectId: PROJECT_IDS.beacon, percentage: "50.00" },
  { personId: PEOPLE_IDS.marcusReed, projectId: PROJECT_IDS.cedar, percentage: "30.00" },

  // Elena Garcia — planned/observed will mostly agree (CONSISTENT case).
  { personId: PEOPLE_IDS.elenaGarcia, projectId: PROJECT_IDS.atlas, percentage: "40.00" },
  { personId: PEOPLE_IDS.elenaGarcia, projectId: PROJECT_IDS.beacon, percentage: "40.00" },
].map((allocation) => ({
  ...allocation,
  validFrom: DEMO_WEEK_START,
  validTo: null,
  source: "seed",
}));
