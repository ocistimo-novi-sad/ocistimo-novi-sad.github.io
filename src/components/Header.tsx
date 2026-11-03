import { Info, Plus } from 'lucide-react';
import { APP } from '../config';
import { isFirebaseConfigured } from '../services/firebase';
import { useApp } from '../state/app-context';
import { Brand } from './Brand';
import { AccountMenu } from './AccountMenu';

export function Header() {
  const { startCompose, openModal } = useApp();

  return (
    <header className="app-header">
      <Brand />

      {/* No nav: reports vs. actions is the layer switch above the list and the map. */}
      <div className="app-header__actions">
        {!isFirebaseConfigured ? (
          <button
            type="button"
            className="env-badge"
            onClick={() => openModal({ kind: 'info' })}
            title="Podaci se ne čuvaju u bazi. Izaberi za detalje."
          >
            Demo
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn--icon btn--quiet"
          onClick={() => openModal({ kind: 'info' })}
          aria-label="O projektu"
          title="O projektu"
        >
          <Info size={16} aria-hidden="true" />
        </button>

        {/* On mobile the report button lives in the tab bar. */}
        <button
          type="button"
          className="btn btn--accent btn--report"
          onClick={startCompose}
          aria-label="Prijavi problem"
        >
          <Plus size={15} aria-hidden="true" />
          <span className="btn__text">Prijavi problem</span>
        </button>

        <AccountMenu />
      </div>

      <h1 className="visually-hidden">
        {APP.name}: {APP.tagline}
      </h1>
    </header>
  );
}
