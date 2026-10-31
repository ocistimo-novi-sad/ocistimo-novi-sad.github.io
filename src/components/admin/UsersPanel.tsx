import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, LockKeyhole, RefreshCw, Search, TriangleAlert, UsersRound } from 'lucide-react';
import { ROLE_LABELS } from '../../config';
import { formatDate, formatRelativeTime, initials } from '../../lib/format';
import { withTimeout } from '../../lib/timeout';
import { toSerbianError } from '../../services/errors';
import { listUsers, setModerator } from '../../services/roles';
import { useApp } from '../../state/app-context';
import type { UserProfile, UserRole } from '../../types';
import { EmptyState, Spinner } from '../ui/EmptyState';

type RoleFilter = 'all' | 'moderator' | 'admin';

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'Svi' },
  { id: 'moderator', label: 'Moderatori' },
  { id: 'admin', label: 'Administratori' },
];

function roleChangeText(user: UserProfile, role: UserRole): string {
  return role === 'moderator'
    ? `${user.displayName} će moći da odobrava, odbija, menja i briše sve prijave i da obrađuje označen sadržaj.`
    : `${user.displayName} više neće moći da moderira prijave.`;
}

export function UsersPanel() {
  const { auth, notify } = useApp();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [pending, setPending] = useState<{ user: UserProfile; role: UserRole } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await withTimeout(listUsers()));
    } catch (loadError) {
      setError(toSerbianError(loadError, 'Korisnici nisu učitani.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: users?.length ?? 0,
      moderator: users?.filter((user) => user.role === 'moderator').length ?? 0,
      admin: users?.filter((user) => user.role === 'admin').length ?? 0,
    }),
    [users],
  );

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('sr-Latn');
    return (users ?? []).filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (!needle) return true;
      return `${user.displayName} ${user.email ?? ''}`
        .toLocaleLowerCase('sr-Latn')
        .includes(needle);
    });
  }, [users, search, roleFilter]);

  const confirmRole = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await setModerator(pending.user, pending.role === 'moderator');
      setUsers((current) =>
        (current ?? []).map((user) =>
          user.uid === pending.user.uid ? { ...user, role: pending.role } : user,
        ),
      );
      notify(
        'success',
        pending.role === 'moderator'
          ? `${pending.user.displayName} je sada moderator.`
          : `${pending.user.displayName} više nije moderator.`,
      );
      setPending(null);
    } catch (saveError) {
      notify('error', toSerbianError(saveError, 'Ulogu nije moguće promeniti.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !users) {
    return (
      <div className="admin-loading" role="status">
        <Spinner size={16} />
        Učitavanje korisnika…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<TriangleAlert size={20} />}
        title="Korisnici nisu učitani"
        description={error}
        action={
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => void load()}>
            <RefreshCw size={13} aria-hidden="true" /> Pokušaj ponovo
          </button>
        }
      />
    );
  }

  return (
    <div className="users">
      <div className="users__tools">
        <label className="search-field users__search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pretraga po imenu ili mejlu"
            aria-label="Pretraga korisnika"
          />
        </label>
        <div className="users__filters" role="group" aria-label="Filter po ulozi">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`chip${roleFilter === filter.id ? ' is-active' : ''}`}
              aria-pressed={roleFilter === filter.id}
              onClick={() => setRoleFilter(filter.id)}
            >
              {filter.label} <span className="users__count">{counts[filter.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<UsersRound size={20} />}
          title={users?.length ? 'Nema korisnika za ovu pretragu' : 'Još nema korisnika'}
          description={
            users?.length
              ? 'Promenite pretragu ili filter po ulozi.'
              : 'Korisnik se pojavljuje ovde posle prve prijave Google nalogom.'
          }
        />
      ) : (
        <ul className="user-list">
          <li className="user-row user-row--head" aria-hidden="true">
            <span>Korisnik</span>
            <span>Član od</span>
            <span>Aktivnost</span>
            <span>Uloga</span>
          </li>
          {visible.map((user) => {
            const isSelf = user.uid === auth.user?.uid;
            const confirming = pending?.user.uid === user.uid;
            return (
              <li key={user.uid} className={`user-row${confirming ? ' is-confirming' : ''}`}>
                <div className="user-row__identity">
                  {user.photoURL ? (
                    <img
                      className="account__avatar"
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="account__avatar account__avatar--initials">
                      {initials(user.displayName) || 'NS'}
                    </span>
                  )}
                  <span className="user-row__names">
                    <strong>
                      {user.displayName}
                      {isSelf ? <span className="user-row__self">vi</span> : null}
                    </strong>
                    <span className="user-row__email">{user.email ?? 'mejl nije sačuvan'}</span>
                  </span>
                </div>

                <span className="user-row__meta">
                  <span className="user-row__label">Član od</span>
                  {user.createdAt ? formatDate(user.createdAt) : '–'}
                </span>
                <span className="user-row__meta">
                  <span className="user-row__label">Aktivnost</span>
                  {user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : '–'}
                </span>

                <div className="user-row__role">
                  {user.role === 'admin' ? (
                    <span
                      className="role-lock"
                      title="Administratori se dodeljuju u Firebase konzoli."
                    >
                      <LockKeyhole size={12} aria-hidden="true" /> {ROLE_LABELS.admin}
                    </span>
                  ) : (
                    <label className="select-field select-field--wide">
                      <select
                        value={confirming ? pending.role : user.role}
                        onChange={(event) => {
                          const role = event.target.value as UserRole;
                          setPending(role === user.role ? null : { user, role });
                        }}
                        disabled={saving}
                        aria-label={`Uloga: ${user.displayName}`}
                      >
                        <option value="user">{ROLE_LABELS.user}</option>
                        <option value="moderator">{ROLE_LABELS.moderator}</option>
                      </select>
                      <ChevronDown size={12} aria-hidden="true" />
                    </label>
                  )}
                </div>

                {confirming ? (
                  <div className="user-row__confirm" role="alert">
                    <p>{roleChangeText(user, pending.role)}</p>
                    <div className="user-row__confirm-actions">
                      <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        onClick={() => setPending(null)}
                        disabled={saving}
                      >
                        Odustani
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => void confirmRole()}
                        disabled={saving}
                      >
                        {saving ? <Spinner size={12} /> : null}
                        Potvrdi
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="users__note">
        Administratori se dodaju samo u Firebase konzoli (kolekcija <code>admins</code>).
        Moderatori ne vide spisak korisnika.
      </p>
    </div>
  );
}
