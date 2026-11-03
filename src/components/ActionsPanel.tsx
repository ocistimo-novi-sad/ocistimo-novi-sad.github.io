import {
  CalendarPlus,
  HandHeart,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { ACTION_STATUS_MAP } from '../config';
import {
  formatDate,
  formatDistance,
  formatTime,
  formatWeekday,
  plural,
  splitDate,
} from '../lib/format';
import { distanceInMeters } from '../lib/geo';
import { optimizedImageUrl } from '../services/images';
import { useApp } from '../state/app-context';
import type { CleanupAction } from '../types';
import { SEARCH_PLACEHOLDER, SearchInput } from './FiltersBar';
import { LayerSwitch } from './LayerSwitch';
import { NearMeButton } from './NearMeButton';
import { EmptyState } from './ui/EmptyState';

function ActionCard({
  action,
  selected,
}: {
  action: CleanupAction;
  selected: boolean;
}) {
  const { selectAction, actionsNearest, userPosition } = useApp();
  const date = splitDate(action.date);
  const distance =
    actionsNearest && userPosition ? distanceInMeters(userPosition, action) : null;

  return (
    <button
      type="button"
      className={`action-card${selected ? ' is-selected' : ''}`}
      onClick={() => selectAction(action)}
      aria-pressed={selected}
    >
      {action.coverUrl ? (
        <span className="action-card__cover" aria-hidden="true">
          <img src={optimizedImageUrl(action.coverUrl, 160)} alt="" loading="lazy" />
          <span className="action-card__cover-date">
            <strong>{date.day}</strong> {date.month}
          </span>
        </span>
      ) : (
        <span className="action-card__date" aria-hidden="true">
          <strong>{date.day}</strong>
          <span>{date.month}</span>
        </span>
      )}

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
          {distance !== null ? (
            <span className="card-distance">{formatDistance(distance)}</span>
          ) : null}
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
    setLayer,
    upcomingActions: upcoming,
    pastActions: past,
    filteredActions: list,
    actionScope: scope,
    setActionScope: setScope,
    actionQuery,
    setActionQuery,
    actionsNearest,
    setActionsNearest,
  } = useApp();

  return (
    <section className="panel panel--actions" aria-label="Akcije čišćenja">
      <div className="panel__head">
        <LayerSwitch />

        <p className="panel__intro">Pridruži se akciji. Akcija sanira jednu ili više prijava.</p>

        <SearchInput
          value={actionQuery}
          onChange={setActionQuery}
          placeholder={SEARCH_PLACEHOLDER.actions}
          label="Pretraga akcija"
        />

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

        {auth.isModerator ? (
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
        <div className="panel__list-head">
          <NearMeButton active={actionsNearest} onToggle={setActionsNearest} />
          <span className="panel__list-tools">
            <span className="panel__list-count">
              {list.length} {plural(list.length, 'akcija', 'akcije', 'akcija')}
            </span>
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
          </span>
        </div>

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
            description={actionsError ?? 'Proveri internet vezu i pokušaj ponovo.'}
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

        {actionsPhase === 'ready' && list.length === 0 && actionQuery.trim() ? (
          <EmptyState
            icon={<Search size={20} />}
            title="Nema akcija za ovu pretragu"
            description="Pokušaj drugi naziv ili mesto okupljanja."
            action={
              <button
                type="button"
                className="btn btn--quiet btn--sm"
                onClick={() => setActionQuery('')}
              >
                Obriši pretragu
              </button>
            }
          />
        ) : null}

        {actionsPhase === 'ready' && list.length === 0 && !actionQuery.trim() ? (
          <EmptyState
            icon={scope === 'upcoming' ? <HandHeart size={20} /> : <CalendarPlus size={20} />}
            title={scope === 'upcoming' ? 'Nema planiranih akcija' : 'Još nema završenih akcija'}
            description={
              scope === 'upcoming'
                ? 'Moderatori i koordinatori zajednice organizuju akcije čišćenja. Do tada možeš pregledati prijave na mapi.'
                : 'Završene akcije se prikazuju ovde sa svim rešenim prijavama.'
            }
            action={
              scope === 'upcoming' ? (
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setLayer('reports')}
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
