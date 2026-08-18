/**
 * Translates the short project codes/keys used by the fake allocation and
 * Jira source systems (e.g. "ATLAS") into the canonical project name stored
 * in PostgreSQL (e.g. "Project Atlas"). This is source-specific knowledge
 * and stays inside the connector layer, per SPEC.md engineering constraint
 * "keep connector-specific schemas outside the verification engine."
 */
export const PROJECT_CODE_TO_NAME: Record<string, string> = {
  ATLAS: "Project Atlas",
  BEACON: "Project Beacon",
  CEDAR: "Project Cedar",
};

export function resolveProjectNameFromCode(code: string): string {
  const name = PROJECT_CODE_TO_NAME[code.toUpperCase()];
  if (!name) {
    throw new Error(`Unknown project code "${code}" — no mapping to a project name is defined`);
  }
  return name;
}
