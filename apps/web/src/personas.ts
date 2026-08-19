import type { ManagerPerson } from "./api/types";

export type PersonaId = "employee" | "manager" | "executive";

export interface Persona {
  id: PersonaId;
  label: string;
  /** Who the viewer is acting as, shown in the sidebar. */
  actorName: string;
  actorRole: string;
  navLabel: string;
  navCode: string;
}

/**
 * A deterministic demo persona model — explicitly not authentication. The
 * Employee persona binds to a real seeded person so its screens act on real
 * persisted data; Manager and Executive are viewing contexts over the whole
 * demo team, matching how the backend scopes those APIs.
 */
export const PERSONAS: Record<PersonaId, Persona> = {
  employee: {
    id: "employee",
    label: "Employee",
    actorName: "Priya Shah",
    actorRole: "Senior Software Engineer",
    navLabel: "My Week",
    navCode: "REVIEW",
  },
  manager: {
    id: "manager",
    label: "Manager",
    actorName: "Team Manager",
    actorRole: "Engineering",
    navLabel: "Team Verification",
    navCode: "EXCEPTIONS",
  },
  executive: {
    id: "executive",
    label: "Executive",
    actorName: "Executive",
    actorRole: "Resource Health",
    navLabel: "Resource Health",
    navCode: "OVERVIEW",
  },
};

export const PERSONA_ORDER: PersonaId[] = ["employee", "manager", "executive"];

/** The Employee persona is demonstrated as the primary mismatch case. */
export const EMPLOYEE_PERSONA_NAME = "Priya Shah";

/** Resolves the Employee persona to a real seeded person, falling back to the first known person. */
export function resolveEmployeePersonId(people: ManagerPerson[]): string | null {
  if (people.length === 0) return null;
  const match = people.find((person) => person.name === EMPLOYEE_PERSONA_NAME);
  return (match ?? people[0]).personId;
}
