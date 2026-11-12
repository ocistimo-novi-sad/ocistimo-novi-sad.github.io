import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ClipboardCheck,
  LogOut,
  Mail,
  NotebookText,
  Settings,
  UserRound,
} from 'lucide-react';
import { ROLE_LABELS } from '../config';
import { initials } from '../lib/format';
import { toSerbianError } from '../services/errors';
import {
  fetchMailPrefs,
  saveMailPref,
  type MailKind,
  type MailPrefs,
} from '../services/profile';
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
  const uid = auth.user?.uid ?? null;
  // E-mail preferences (#79), loaded the first time the menu opens.
  const [mailPrefs, setMailPrefs] = useState<{ uid: string; prefs: MailPrefs } | null>(null);
  const [savingMail, setSavingMail] = useState<MailKind | null>(null);
  const prefs = mailPrefs && mailPrefs.uid === uid ? mailPrefs.prefs : null;

  useEffect(() => {
    if (!open || !uid || prefs) return;
    let cancelled = false;
    fetchMailPrefs(uid)
      .then((loaded) => {
        if (!cancelled) setMailPrefs({ uid, prefs: loaded });
      })
      .catch(() => {
        // The switches stay hidden; nothing else in the menu depends on them.
      });
    return () => {
      cancelled = true;
    };
  }, [open, uid, prefs]);

  const toggleMail = async (kind: MailKind) => {
    if (!uid || !prefs || savingMail) return;
    const enabled = !prefs[kind];
    setSavingMail(kind);
    setMailPrefs({ uid, prefs: { ...prefs, [kind]: enabled } });
    try {
      await saveMailPref(uid, kind, enabled);
    } catch (error) {
      setMailPrefs({ uid, prefs });
      notify('error', toSerbianError(error, 'Podešavanje nije sačuvano. Pokušaj ponovo.'));
    } finally {
      setSavingMail(null);
    }
  };

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
        <span className="btn__text">Uloguj se</span>
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
        <div className="account__menu" role="menu">
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
            role="menuitem"
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
              role="menuitem"
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
              role="menuitem"
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
          {prefs ? (
            <div className="account__group" role="group" aria-labelledby="account-mail-label">
              <span id="account-mail-label" className="account__group-label">
                <Mail size={13} aria-hidden="true" />
                Obaveštenja e-poštom
              </span>
              <MailSwitch
                label="O mojim prijavama"
                checked={prefs.myReports}
                busy={savingMail === 'myReports'}
                onToggle={() => void toggleMail('myReports')}
              />
              {auth.isModerator ? (
                <MailSwitch
                  label="Za moderaciju"
                  checked={prefs.moderation}
                  busy={savingMail === 'moderation'}
                  onToggle={() => void toggleMail('moderation')}
                />
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            role="menuitem"
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

function MailSwitch({
  label,
  checked,
  busy,
  onToggle,
}: {
  label: string;
  checked: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      aria-busy={busy}
      className="account__item account__switch"
      onClick={onToggle}
    >
      <span className="account__switch-label">{label}</span>
      <span className="account__switch-track" aria-hidden="true">
        <span className="account__switch-thumb" />
      </span>
    </button>
  );
}
