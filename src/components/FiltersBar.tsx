import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  ListFilter,
  MapPinned,
  Search,
  X,
} from 'lucide-react';
import { CATEGORIES, REPORT_STATUSES, SORT_OPTIONS } from '../config';
import { useApp } from '../state/app-context';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { StatusDot } from './ui/StatusBadge';

function StatusFilter() {
  const { filters, updateFilters } = useApp();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggleStatus = (status: (typeof REPORT_STATUSES)[number]['id']) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((item) => item !== status)
      : [...filters.statuses, status];
    updateFilters({ statuses: next });
  };

  const label =
    filters.statuses.length === 0
      ? 'Svi statusi'
      : filters.statuses.length === 1
        ? REPORT_STATUSES.find((status) => status.id === filters.statuses[0])?.label ??
          'Status'
        : `Status (${filters.statuses.length})`;

  return (
    <div className="popover" ref={wrapperRef}>
      <button
        type="button"
        className={`filter-btn${filters.statuses.length > 0 ? ' is-active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <ListFilter size={13} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open ? (
        <div className="popover__panel" role="group" aria-label="Filter po statusu">
          <p className="popover__title">Status prijave</p>
          <button
            type="button"
            className={`popover__row${filters.statuses.length === 0 ? ' is-active' : ''}`}
            onClick={() => updateFilters({ statuses: [] })}
          >
            <span className="popover__check" aria-hidden="true">
              {filters.statuses.length === 0 ? '✓' : ''}
            </span>
            Svi statusi
          </button>
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
      ) : null}
    </div>
  );
}

export function FiltersBar() {
  const { filters, updateFilters, toggleCategory, resetFilters, mapRef } = useApp();
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

  const toggleViewport = () => {
    if (filters.viewportOnly) {
      updateFilters({ viewportOnly: false });
      return;
    }
    const bounds = mapRef.current
      ? {
          south: mapRef.current.getBounds().getSouth(),
          west: mapRef.current.getBounds().getWest(),
          north: mapRef.current.getBounds().getNorth(),
          east: mapRef.current.getBounds().getEast(),
        }
      : null;
    updateFilters({ viewportOnly: true, bounds });
  };

  const activeCount =
    filters.categories.length +
    filters.statuses.length +
    (filters.query.trim() ? 1 : 0) +
    (filters.viewportOnly ? 1 : 0);

  return (
    <div className="filters">
      <div className="search-field">
        <Search size={15} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          value={filters.query}
          onChange={(event) => updateFilters({ query: event.target.value })}
          placeholder="Pretraži ulicu, kvart ili opis"
          aria-label="Pretraga prijava"
          autoComplete="off"
        />
        {filters.query ? (
          <button
            type="button"
            className="search-field__clear"
            onClick={() => updateFilters({ query: '' })}
            aria-label="Obriši pretragu"
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : (
          <kbd className="search-field__hint" aria-hidden="true">
            /
          </kbd>
        )}
      </div>

      <div className="category-chips" role="group" aria-label="Filter po kategoriji">
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

      <div className="filter-tools">
        <StatusFilter />

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

        <button
          type="button"
          className={`icon-btn${filters.viewportOnly ? ' is-active' : ''}`}
          onClick={toggleViewport}
          aria-pressed={filters.viewportOnly}
          title="Samo prijave na vidljivom delu mape"
          aria-label="Samo prijave na vidljivom delu mape"
        >
          <MapPinned size={15} aria-hidden="true" />
        </button>

        {activeCount > 0 ? (
          <button type="button" className="link-btn" onClick={resetFilters}>
            Očisti
          </button>
        ) : null}
      </div>
    </div>
  );
}
