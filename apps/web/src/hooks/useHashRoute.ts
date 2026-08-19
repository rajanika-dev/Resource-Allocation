import { useCallback, useEffect, useState } from "react";

function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.length > 0 ? hash : "/executive";
}

/**
 * Hash-based routing in ~30 lines instead of a router dependency. Using real
 * URLs (rather than component state) means a browser refresh returns to the
 * same screen — which the demo relies on when proving a correction persisted.
 */
export function useHashRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onHashChange = () => setPath(currentPath());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((next: string) => {
    window.location.hash = next;
    // jsdom does not always emit hashchange synchronously; keep state in step.
    setPath(next);
  }, []);

  return { path, navigate };
}

export interface Route {
  persona: "employee" | "manager" | "executive";
  personId: string | null;
}

/** `/manager/<personId>` -> { persona: "manager", personId }. */
export function parseRoute(path: string): Route {
  const [, personaSegment, personId] = path.split("/");

  const persona =
    personaSegment === "employee" || personaSegment === "manager" ? personaSegment : "executive";

  return { persona, personId: personId ?? null };
}
