import { Info, Plus } from 'lucide-react';
import { APP } from '../config';
import { isFirebaseConfigured } from '../services/firebase';
import { useApp } from '../state/app-context';
import { Brand } from './Brand';
import { AccountMenu } from './AccountMenu';

export function Header() {
  const { view, setView, startCompose, openModal } = useApp();
  const isActions = view === 'actions';

  return (
    <header className="app-header">
      <Brand />

      <nav className="app-nav" aria-label="Glavna navigacija">
        <button
          type="button"
          className={`nav-link${!isActions ? ' is-active' : ''}`}
          aria-current={!isActions ? 'page' : undefined}
          onClick={() => setView('map')}
        >
          Mapa
        </button>
        <button
          type="button"
          className={`nav-link${isActions ? ' is-active' : ''}`}
          aria-current={isActions ? 'page' : undefined}
          onClick={() => setView('actions')}
        >
          Akcije
        </button>
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

        <button
          type="button"
          className="btn btn--primary btn--report"
          onClick={startCompose}
          aria-label="Prijavi problem"
        >
          <Plus size={15} aria-hidden="true" />
          <span className="btn__text">Prijavi problem</span>
          <span className="btn__text-short">Prijavi</span>
        </button>

        <AccountMenu />
      </div>

      <span className="visually-hidden">{APP.tagline}</span>
    </header>
  );
}
