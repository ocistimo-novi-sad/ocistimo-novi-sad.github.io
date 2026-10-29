import { useState } from 'react';
import {
  CalendarPlus,
  HandHeart,
  MapPin,
  Plus,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { ACTION_STATUS_MAP } from '../config';
import { formatDate, formatTime, formatWeekday, plural, splitDate } from '../lib/format';
import { useApp } from '../state/app-context';
import type { CleanupAction } from '../types';
import { EmptyState } from './ui/EmptyState';

function ActionCard({
  action,
  selected,
}: {
  action: CleanupAction;
  selected: boolean;
}) {
  const { selectAction } = useApp();
  const date = splitDate(action.date);

  return (
    <button
      type="button"
      className={`action-card${selected ? ' is-selected' : ''}`}
      onClick={() => selectAction(action)}
      aria-pressed={selected}
    >
      <span className="action-card__date" aria-hidden="true">
        <strong>{date.day}</strong>
        <span>{date.month}</span>
      </span>

      <span className="action-card__body">
        <span className="action-card__top">
          <span className={`action-status action-status--${action.status}`}>
            {ACTION_STATUS_MAP[action.status]}
          </span>
          <span className="action-card__reports">
            {action.reportIds.length}{' '}
            {plural(action.reportIds.length, 'prijava', 'prijave', 'prijava')}
          </span>
        </span>
        <span className="action-card__title">{action.title}</span>
        <span className="action-card__meta">
          <MapPin size={12} aria-hidden="true" />
          <span>{action.meetingPoint}</span>
        </span>
        <span className="action-card__meta action-card__meta--time">
          {formatWeekday(action.date)}, {formatDate(action.date)} u {formatTime(action.date)}
        </span>
      </span>
    </button>
  );
}

export function ActionsPanel() {
  const {
    actions,
    actionsPhase,
    actionsError,
    reloadActions,
    selectedAction,
    auth,
    openModal,
    setView,
  } = useApp();
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');

  const cutoff = Date.now() - 4 * 3_600_000;
  const upcoming = actions
    .filter(
      (action) =>
        (action.status === 'planned' || action.status === 'in_progress') &&
        action.date.getTime() >= cutoff,
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = actions
    .filter(
      (action) =>
        !(
          (action.status === 'planned' || action.status === 'in_progress') &&
          action.date.getTime() >= cutoff
        ),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const list = scope === 'upcoming' ? upcoming : past;

  return (
    <section className="panel panel--actions" aria-label="Akcije čišćenja">
      <div className="panel__head">
        <div className="panel__eyebrow-row">
          <span className="eyebrow">Novi Sad · Akcije</span>
          <span className="panel__count">{actions.length}</span>
          <button
            type="button"
            className="icon-btn icon-btn--ghost"
            onClick={() => void reloadActions()}
            aria-label="Osveži akcije"
            title="Osveži akcije"
            disabled={actionsPhase === 'loading'}
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={actionsPhase === 'loading' ? 'spinner' : undefined}
            />
          </button>
        </div>

        <p className="panel__intro">
          Zajednička čišćenja povezuju prijave sa iste lokacije. Otvorite akciju da vidite gde se
          okupljamo i šta je potrebno poneti.
        </p>

        <div className="segmented" role="tablist" aria-label="Period akcija">
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'upcoming'}
            className={`segmented__item${scope === 'upcoming' ? ' is-active' : ''}`}
            onClick={() => setScope('upcoming')}
          >
            Predstojeće
            <span>{upcoming.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'past'}
            className={`segmented__item${scope === 'past' ? ' is-active' : ''}`}
            onClick={() => setScope('past')}
          >
            Završene
            <span>{past.length}</span>
          </button>
        </div>

        {auth.isAdmin ? (
          <button
            type="button"
            className="btn btn--quiet btn--sm btn--block"
            onClick={() => openModal({ kind: 'admin' })}
          >
            <Plus size={14} aria-hidden="true" /> Nova akcija
          </button>
        ) : null}
      </div>

      <div className="panel__scroll">
        {actionsPhase === 'loading' && actions.length === 0 ? (
          <div className="list-skeleton" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <div className="skeleton-row" key={index}>
                <span className="skeleton skeleton--thumb" />
                <span className="skeleton-row__lines">
                  <span className="skeleton skeleton--short" />
                  <span className="skeleton skeleton--long" />
                  <span className="skeleton skeleton--medium" />
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {actionsPhase === 'error' && actions.length === 0 ? (
          <EmptyState
            icon={<TriangleAlert size={20} />}
            title="Akcije nisu učitane"
            description={actionsError ?? 'Proverite internet vezu i pokušajte ponovo.'}
            action={
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => void reloadActions()}
              >
                <RefreshCw size={14} aria-hidden="true" /> Pokušaj ponovo
              </button>
            }
          />
        ) : null}

        {actionsPhase === 'ready' && list.length === 0 ? (
          <EmptyState
            icon={scope === 'upcoming' ? <HandHeart size={20} /> : <CalendarPlus size={20} />}
            title={scope === 'upcoming' ? 'Nema planiranih akcija' : 'Još nema završenih akcija'}
            description={
              scope === 'upcoming'
                ? 'Kada se za istu lokaciju prikupi dovoljno prijava, administracija objavljuje akciju čišćenja. Do tada možete pregledati prijave na mapi.'
                : 'Završene akcije se prikazuju ovde sa svim rešenim prijavama.'
            }
            action={
              scope === 'upcoming' ? (
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setView('map')}
                >
                  Pogledaj prijave
                </button>
              ) : undefined
            }
          />
        ) : null}

        {list.length > 0 ? (
          <ul className="action-list">
            {list.map((action) => (
              <li key={action.id}>
                <ActionCard action={action} selected={selectedAction?.id === action.id} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="panel__foot">
        <span>Akcije objavljuje administracija na osnovu prijava iz zajednice.</span>
      </div>
    </section>
  );
}
