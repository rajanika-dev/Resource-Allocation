import { useCallback, useState } from "react";
import { api } from "./api/client";
import type { ManagerExceptions } from "./api/types";
import { Sidebar } from "./components/Sidebar";
import { ErrorState, LoadingState, formatWeek } from "./components/primitives";
import { parseRoute, useHashRoute } from "./hooks/useHashRoute";
import { useAsync } from "./hooks/useAsync";
import { EmployeeWeekPage } from "./pages/EmployeeWeekPage";
import { ExecutiveHealthPage } from "./pages/ExecutiveHealthPage";
import { ManagerTeamPage } from "./pages/ManagerTeamPage";
import { PersonReviewPage } from "./pages/PersonReviewPage";
import { resolveEmployeePersonId, type PersonaId } from "./personas";

export default function App() {
  const { path, navigate } = useHashRoute();
  const { persona, personId } = parseRoute(path);

  // One bootstrap call gives us the demo week plus the roster used to bind the
  // Employee persona to a real seeded person. It works before sync has run,
  // because the API left-joins verifications onto people.
  const roster = useAsync<ManagerExceptions>(() => api.getManagerExceptions(), []);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Bumped after a sync so every mounted page refetches persisted state.
  const [dataVersion, setDataVersion] = useState(0);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await api.sync();
      roster.refetch();
      setDataVersion((version) => version + 1);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  }, [roster]);

  const selectPersona = (next: PersonaId) => navigate(`/${next}`);

  if (roster.loading) {
    return (
      <div className="app">
        <div className="content">
          <LoadingState label="Connecting to the verification service…" />
        </div>
      </div>
    );
  }

  if (roster.error) {
    return (
      <div className="app">
        <div className="content">
          <ErrorState message={roster.error} onRetry={roster.refetch} />
        </div>
      </div>
    );
  }

  const employeePersonId = resolveEmployeePersonId(roster.data?.people ?? []);
  const weekLabel = roster.data ? formatWeek(roster.data.weekStart) : null;

  const renderPage = () => {
    if (persona === "employee") {
      if (!employeePersonId) {
        return <ErrorState message="No people are seeded yet. Run pnpm db:seed, then sync." />;
      }
      return <EmployeeWeekPage personId={employeePersonId} onRunSync={runSync} syncing={syncing} />;
    }

    if (persona === "manager") {
      return personId ? (
        <PersonReviewPage
          personId={personId}
          backLabel="Back to team verification"
          onBack={() => navigate("/manager")}
        />
      ) : (
        <ManagerTeamPage
          onOpenPerson={(id) => navigate(`/manager/${id}`)}
          onRunSync={runSync}
          syncing={syncing}
        />
      );
    }

    return personId ? (
      <PersonReviewPage
        personId={personId}
        backLabel="Back to resource health"
        onBack={() => navigate("/executive")}
      />
    ) : (
      <ExecutiveHealthPage
        onOpenPerson={(id) => navigate(`/executive/${id}`)}
        onRunSync={runSync}
        syncing={syncing}
      />
    );
  };

  return (
    <div className="app">
      <Sidebar
        persona={persona}
        onSelectPersona={selectPersona}
        onNavigateHome={() => navigate(`/${persona}`)}
        onRunSync={runSync}
        syncing={syncing}
        weekLabel={weekLabel}
        atRoot={!personId}
      />

      <main className="content">
        <div className="content-inner">
          {syncError && (
            <div className="callout callout-danger" style={{ marginBottom: 16 }}>
              <div className="callout-title">Sync failed</div>
              {syncError}
            </div>
          )}
          {/* Remounting on persona/person/sync keeps each page's data load simple. */}
          <div key={`${persona}-${personId ?? "root"}-${dataVersion}`}>{renderPage()}</div>
        </div>
      </main>
    </div>
  );
}
