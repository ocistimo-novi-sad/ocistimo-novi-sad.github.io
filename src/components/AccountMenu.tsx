import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '../state/app-context';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AccountMenu() {
  const { auth, openModal, notify } = useApp();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!auth.configured) return null;

  if (!auth.ready) {
    return <span className="account-placeholder" aria-hidden="true" />;
  }

  if (!auth.user) {
    return (
      <button
        type="button"
        className="btn btn--quiet btn--account"
        onClick={() => openModal({ kind: 'auth', intent: 'generic' })}
      >
        <UserRound size={15} aria-hidden="true" />
        <span className="btn__text">Prijava</span>
      </button>
    );
  }

  const name = auth.user.displayName ?? 'Član zajednice';

  return (
    <div className="account" ref={wrapperRef}>
      <button
        type="button"
        className="account__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        aria-label={`Nalog: ${name}`}
      >
        {auth.user.photoURL ? (
          <img className="account__avatar" src={auth.user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="account__avatar account__avatar--initials">
            {initials(name) || 'NS'}
          </span>
        )}
        <ChevronDown size={13} className="account__chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="account__menu" role="menu">
          <div className="account__identity">
            <span className="account__name">{name}</span>
            <span className="account__email">{auth.user.email}</span>
          </div>
          {auth.isAdmin ? (
            <button
              type="button"
              role="menuitem"
              className="account__item"
              onClick={() => {
                setOpen(false);
                openModal({ kind: 'admin' });
              }}
            >
              <ShieldCheck size={15} aria-hidden="true" />
              Administracija
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="account__item"
            onClick={() => {
              setOpen(false);
              void auth
                .signOut()
                .then(() => notify('info', 'Odjavljeni ste.'))
                .catch(() => notify('error', 'Odjava nije uspela. Pokušajte ponovo.'));
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Odjava
          </button>
        </div>
      ) : null}
    </div>
  );
}
