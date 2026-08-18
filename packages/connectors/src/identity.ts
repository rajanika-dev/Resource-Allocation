import { db, people, projects } from "@resource-verification/database";

/**
 * Maps the fake external identifiers used by demo source files (emails,
 * project codes/labels) to the stable people.id / projects.id rows already
 * persisted in PostgreSQL by Task 1's seed. This is the simplest mapping
 * that gets normalization to use stable internal IDs — not a general
 * identity-resolution platform.
 */
export interface IdentityMaps {
  personIdByEmail: Map<string, string>;
  projectIdByName: Map<string, string>;
  personNameById: Map<string, string>;
  personEmailById: Map<string, string>;
  projectNameById: Map<string, string>;
}

export async function loadIdentityMaps(): Promise<IdentityMaps> {
  const allPeople = await db.select({ id: people.id, name: people.name, email: people.email }).from(people);
  const allProjects = await db.select({ id: projects.id, name: projects.name }).from(projects);

  return {
    personIdByEmail: new Map(allPeople.map((person) => [person.email.toLowerCase(), person.id])),
    projectIdByName: new Map(allProjects.map((project) => [project.name, project.id])),
    personNameById: new Map(allPeople.map((person) => [person.id, person.name])),
    personEmailById: new Map(allPeople.map((person) => [person.id, person.email])),
    projectNameById: new Map(allProjects.map((project) => [project.id, project.name])),
  };
}

export function resolvePersonIdByEmail(email: string, maps: IdentityMaps): string {
  const personId = maps.personIdByEmail.get(email.toLowerCase());
  if (!personId) {
    throw new Error(
      `Unknown person email "${email}" — no matching row in the people table. Has the database been seeded (pnpm db:seed)?`,
    );
  }
  return personId;
}

export function resolveProjectIdByName(name: string, maps: IdentityMaps): string {
  const projectId = maps.projectIdByName.get(name);
  if (!projectId) {
    throw new Error(
      `Unknown project "${name}" — no matching row in the projects table. Has the database been seeded (pnpm db:seed)?`,
    );
  }
  return projectId;
}
