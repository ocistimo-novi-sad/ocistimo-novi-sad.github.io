import { useEffect, useRef, useState, type Ref } from 'react';
import { ArrowUpDown, ChevronDown, SlidersHorizontal, Search, X } from 'lucide-react';
import { CATEGORIES, DEFAULT_FILTERS, REPORT_STATUSES, SORT_OPTIONS } from '../config';
import { useApp } from '../state/app-context';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { StatusDot } from './ui/StatusBadge';
import { Modal } from './modals/Modal';

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  inputRef,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Shows the "/" shortcut hint while empty. */
  hint?: boolean;
}) {
  return (
    <div className="search-field">
      <Search size={15} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className="search-field__clear"
          onClick={() => onChange('')}
          aria-label="Obriši pretragu"
        >
          <X size={13} aria-hidden="true" />
        </button>
      ) : hint ? (
        <kbd className="search-field__hint" aria-hidden="true">
          /
        </kbd>
      ) : null}
    </div>
  );
}

function CategoryChips({ scroll = false }: { scroll?: boolean }) {
  const { filters, updateFilters, toggleCategory } = useApp();

  return (
    <div
      className={`category-chips${scroll ? ' category-chips--scroll' : ''}`}
      role="group"
      aria-label="Filter po kategoriji"
    >
      <button
        type="button"
        className={`chip${filters.categories.length === 0 ? ' is-active' : ''}`}
        onClick={() => updateFilters({ categories: [] })}
        aria-pressed={filters.categories.length === 0}
      >
        Sve
      </button>
      {CATEGORIES.map((category) => {
        const active = filters.categories.includes(category.id);
        return (
          <button
            key={category.id}
            type="button"
            className={`chip${active ? ' is-active' : ''}`}
            data-category={category.id}
            onClick={() => toggleCategory(category.id)}
            aria-pressed={active}
            title={category.hint}
          >
            <CategoryGlyph category={category.id} size={12} />
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

function ReportFilterOptions() {
  const { filters, updateFilters } = useApp();

  const toggleStatus = (status: (typeof REPORT_STATUSES)[number]['id']) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((item) => item !== status)
      : [...filters.statuses, status];
    updateFilters({ statuses: next });
  };

  return (
    <>
      <section className="filter-sheet__section">
        <p className="eyebrow">Kategorija</p>
        <CategoryChips />
      </section>

      <section className="filter-sheet__section" role="group" aria-label="Filter po statusu">
        <p className="eyebrow">Status</p>
        <div className="filter-sheet__rows filter-sheet__rows--grid">
          {REPORT_STATUSES.map((status) => {
            const checked = filters.statuses.includes(status.id);
            return (
              <label key={status.id} className={`popover__row${checked ? ' is-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStatus(status.id)}
                />
                <StatusDot status={status.id} />
                <span>{status.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="filter-sheet__section">
        <p className="eyebrow">Oblast i sortiranje</p>
        <label className={`popover__row${filters.viewportOnly ? ' is-active' : ''}`}>
          <input
            type="checkbox"
            checked={filters.viewportOnly}
            onChange={() => updateFilters({ viewportOnly: !filters.viewportOnly })}
          />
          <span>Samo prijave na vidljivom delu mape</span>
        </label>
        <label className="select-field">
          <ArrowUpDown size={13} aria-hidden="true" />
          <select
            value={filters.sort}
            onChange={(event) =>
              updateFilters({ sort: event.target.value as typeof filters.sort })
            }
            aria-label="Sortiranje prijava"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} aria-hidden="true" />
        </label>
      </section>
    </>
  );
}

function ActionFilterOptions() {
  const { actionScope, setActionScope, upcomingActions, pastActions } = useApp();

  return (
    <section className="filter-sheet__section" role="radiogroup" aria-label="Period akcija">
      <p className="eyebrow">Period</p>
      <div className="filter-sheet__rows">
        <label className={`popover__row${actionScope === 'upcoming' ? ' is-active' : ''}`}>
          <input
            type="radio"
            name="action-scope"
            checked={actionScope === 'upcoming'}
            onChange={() => setActionScope('upcoming')}
          />
          <span>Predstojeće ({upcomingActions.length})</span>
        </label>
        <label className={`popover__row${actionScope === 'past' ? ' is-active' : ''}`}>
          <input
            type="radio"
            name="action-scope"
            checked={actionScope === 'past'}
            onChange={() => setActionScope('past')}
          />
          <span>Završene ({pastActions.length})</span>
        </label>
      </div>
    </section>
  );
}

function FiltersSheet({ onClose }: { onClose: () => void }) {
  const { layer, filteredReports, filteredActions, updateFilters, setActionScope } = useApp();
  const isActions = layer === 'actions';
  const count = isActions ? filteredActions.length : filteredReports.length;

  // Clears what the sheet sets; the search stays as typed.
  const clear = () => {
    if (isActions) {
      setActionScope('upcoming');
      return;
    }
    updateFilters({
      categories: [],
      statuses: [],
      sort: DEFAULT_FILTERS.sort,
      viewportOnly: false,
    });
  };

  return (
    <Modal
      title={isActions ? 'Filteri akcija' : 'Filteri prijava'}
      description="Filteri važe i za mapu i za listu."
      onClose={onClose}
      size="sm"
      footer={
        <div className="filter-sheet__foot">
          <button type="button" className="link-btn" onClick={clear}>
            Očisti
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Prikaži {count}
          </button>
        </div>
      }
    >
      <div className="filter-sheet">
        {isActions ? <ActionFilterOptions /> : <ReportFilterOptions />}
      </div>
    </Modal>
  );
}

/** Opens the filters of the current layer; the badge counts what is narrowed. */
export function FiltersButton() {
  const { layer, filters, actionScope } = useApp();
  const [open, setOpen] = useState(false);

  const count =
    layer === 'actions'
      ? actionScope === 'past'
        ? 1
        : 0
      : filters.categories.length + filters.statuses.length + (filters.viewportOnly ? 1 : 0);

  return (
    <>
      <button
        type="button"
        className={`filters-btn${count > 0 ? ' is-active' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        <span>Filteri</span>
        {count > 0 ? <span className="filters-btn__count">{count}</span> : null}
      </button>
      {open ? <FiltersSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function FiltersBar() {
  const { filters, updateFilters } = useApp();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="filters">
      <div className="filters__row">
        <SearchInput
          inputRef={searchRef}
          value={filters.query}
          onChange={(query) => updateFilters({ query })}
          placeholder="Pretraži ulicu, kvart ili opis"
          label="Pretraga prijava"
          hint
        />
        <FiltersButton />
      </div>

      <CategoryChips scroll />
    </div>
  );
}
