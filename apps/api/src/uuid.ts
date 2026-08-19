const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres throws a type error (not a clean "not found") if a non-UUID string is compared against a uuid column. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
