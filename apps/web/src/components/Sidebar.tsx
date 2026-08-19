import { PERSONA_ORDER, PERSONAS, type PersonaId } from "../personas";

export function Sidebar({
  persona,
  onSelectPersona,
  onNavigateHome,
  onRunSync,
  syncing,
  weekLabel,
  atRoot,
}: {
  persona: PersonaId;
  onSelectPersona: (persona: PersonaId) => void;
  onNavigateHome: () => void;
  onRunSync: () => void;
  syncing: boolean;
  weekLabel: string | null;
  atRoot: boolean;
}) {
  const active = PERSONAS[persona];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-eyebrow">Ankobia ICP</div>
        <div className="brand-name">Resource Verification</div>
        <div className="brand-sub">
          Weekly allocation assurance
          {weekLabel && (
            <>
              <br />
              {weekLabel}
            </>
          )}
        </div>
      </div>

      <div className="sidebar-section-label">{active.label}</div>
      <nav className="nav">
        <button
          type="button"
          className={`nav-item${atRoot ? " active" : ""}`}
          onClick={onNavigateHome}
          aria-current={atRoot ? "page" : undefined}
        >
          <span>{active.navLabel}</span>
          <span className="nav-code">{active.navCode}</span>
        </button>
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <div className="sidebar-section-label" style={{ padding: "0 0 8px" }}>
          Viewing as
        </div>
        <div className="persona-switcher" role="group" aria-label="Viewing as">
          {PERSONA_ORDER.map((id) => (
            <button
              type="button"
              key={id}
              className={`persona-option${id === persona ? " active" : ""}`}
              onClick={() => onSelectPersona(id)}
              aria-pressed={id === persona}
            >
              <span>{PERSONAS[id].label}</span>
              <span className="persona-option-dot" />
            </button>
          ))}
        </div>

        <div className="signed-in-label">Acting as</div>
        <div className="signed-in-name">{active.actorName}</div>
        <div className="signed-in-role">{active.actorRole}</div>

        <button type="button" className="sidebar-action" onClick={onRunSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Run sync"}
        </button>

        <div className="sidebar-note">Demo build — persona simulation, not authentication.</div>
      </div>
    </aside>
  );
}
