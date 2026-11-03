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

      {/* Reports vs. actions is the layer switch above the list and the map. */}
      <nav className="app-nav" aria-label="Glavna navigacija">
        <button
          type="button"
          className="nav-link"
          onClick={() => openModal({ kind: 'info' })}
        >
          O projektu
        </button>
      </nav>

      <div className="app-header__actions">
        {!isFirebaseConfigured ? (
          <button
            type="button"
            className="env-badge"
            onClick={() => openModal({ kind: 'info' })}
            title="Podaci se ne čuvaju u bazi. Kliknite za detalje."
          >
            Demo
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn--icon btn--quiet mobile-only"
          onClick={() => openModal({ kind: 'info' })}
          aria-label="O projektu"
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

      <span className="visually-hidden">{APP.tagline}</span>
    </header>
  );
}
