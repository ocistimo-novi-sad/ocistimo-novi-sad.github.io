import { useEffect, useId, useRef, useState } from 'react';
import {
  ChevronDown,
  ClipboardCheck,
  LogOut,
  NotebookText,
  Settings,
  UserRound,
} from 'lucide-react';
import { ROLE_LABELS } from '../config';
import { initials } from '../lib/format';
import { useApp } from '../state/app-context';

export function AccountMenu() {
  const { auth, openModal, notify, pendingCount, editCount, resolutionCount, myReports } =
    useApp();
  // Author's reports that need a fix: a rejected report or a rejected proof.
  const rejectedCount = myReports.filter(
    (report) =>
      report.moderation === 'rejected' ||
      (report.status !== 'resolved' && report.resolution?.state === 'rejected'),
  ).length;
  const reviewCount = pendingCount + editCount + resolutionCount;
  const attention = rejectedCount + reviewCount;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    // On release, not on press (WCAG 2.5.2).
    const handlePointerUp = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
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
    // A list of links and buttons that opens and closes (WAI-ARIA disclosure);
    // it closes when focus leaves it.
    <div
      className="account"
      ref={wrapperRef}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="account__trigger"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        aria-label={attention > 0 ? `Nalog: ${name}, ima novosti` : `Nalog: ${name}`}
      >
        {attention > 0 ? <span className="account__alert" aria-hidden="true" /> : null}
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
        <div className="account__menu" id={menuId}>
          <div className="account__identity">
            <span className="account__name">{name}</span>
            <span className="account__email">{auth.user.email}</span>
            {auth.role !== 'user' ? (
              <span className={`account__role account__role--${auth.role}`}>
                {ROLE_LABELS[auth.role]}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="account__item"
            onClick={() => {
              setOpen(false);
              openModal({ kind: 'my-reports' });
            }}
          >
            <NotebookText size={15} aria-hidden="true" />
            Moje prijave
            {rejectedCount > 0 ? (
              <span
                className="account__count account__count--alert"
                title={`${rejectedCount} za ispravku`}
              >
                {rejectedCount}
              </span>
            ) : null}
          </button>
          {auth.isModerator ? (
            <button
              type="button"
              className="account__item"
              onClick={() => {
                setOpen(false);
                openModal({ kind: 'moderation' });
              }}
            >
              <ClipboardCheck size={15} aria-hidden="true" />
              Moderacija
              {reviewCount > 0 ? <span className="account__count">{reviewCount}</span> : null}
            </button>
          ) : null}
          {auth.isModerator ? (
            <button
              type="button"
              className="account__item"
              onClick={() => {
                setOpen(false);
                openModal({ kind: 'admin' });
              }}
            >
              <Settings size={15} aria-hidden="true" />
              {auth.isAdmin ? 'Administracija' : 'Akcije čišćenja'}
            </button>
          ) : null}
          <button
            type="button"
            className="account__item"
            onClick={() => {
              setOpen(false);
              void auth
                .signOut()
                .then(() => notify('info', 'Odjava je uspela.'))
                .catch(() => notify('error', 'Odjava nije uspela. Pokušaj ponovo.'));
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
