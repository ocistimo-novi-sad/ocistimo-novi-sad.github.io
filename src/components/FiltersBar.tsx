import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  ListFilter,
  MapPinned,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CATEGORIES, REPORT_STATUSES, SORT_OPTIONS } from '../config';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useApp } from '../state/app-context';
import { Modal } from './modals/Modal';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { StatusDot } from './ui/StatusBadge';

type StatusId = (typeof REPORT_STATUSES)[number]['id'];

function StatusOptions() {
  const { filters, updateFilters } = useApp();

  const toggleStatus = (status: StatusId) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((item) => item !== status)
      : [...filters.statuses, status];
    updateFilters({ statuses: next });
  };

  return (
    <>
      <button
        type="button"
        className={`popover__row${filters.statuses.length === 0 ? ' is-active' : ''}`}
        onClick={() => updateFilters({ statuses: [] })}
        aria-pressed={filters.statuses.length === 0}
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
            <input type="checkbox" checked={checked} onChange={() => toggleStatus(status.id)} />
            <StatusDot status={status.id} />
            <span>{status.label}</span>
          </label>
        );
      })}
    </>
  );
}

function StatusFilter() {
  const { filters } = useApp();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

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
        ref={triggerRef}
        type="button"
        className={`filter-btn${filters.statuses.length > 0 ? ' is-active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
      >
        <ListFilter size={14} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          className="popover__panel"
          role="dialog"
          aria-label="Filter po statusu"
        >
          <p className="popover__title">Status prijave</p>
          <StatusOptions />
        </div>
      ) : null}
    </div>
  );
}

function SortSelect({ wide = false }: { wide?: boolean }) {
  const { filters, updateFilters } = useApp();

  return (
    <label className={`select-field${wide ? ' select-field--wide' : ''}`}>
      <ArrowUpDown size={14} aria-hidden="true" />
      <select
        value={filters.sort}
        onChange={(event) => updateFilters({ sort: event.target.value as typeof filters.sort })}
        aria-label="Sortiranje prijava"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {wide ? null : <ChevronDown size={13} aria-hidden="true" />}
    </label>
  );
}

/* On phones, status, sorting and the map-area toggle share one bottom sheet. */
function MobileFiltersSheet({
  onClose,
  onToggleViewport,
}: {
  onClose: () => void;
  onToggleViewport: () => void;
}) {
  const { filters, filteredReports, updateFilters } = useApp();
  const hasSheetFilters = filters.statuses.length > 0 || filters.viewportOnly;

  return (
    <Modal
      title="Filteri"
      onClose={onClose}
      size="sm"
      footer={
        <div className="modal-actions">
          {hasSheetFilters ? (
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => updateFilters({ statuses: [], viewportOnly: false })}
            >
              Poništi
            </button>
          ) : null}
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Prikaži rezultate ({filteredReports.length})
          </button>
        </div>
      }
    >
      <div className="filter-sheet">
        <section className="filter-sheet__section" aria-label="Status prijave">
          <p className="section-label">Status prijave</p>
          <StatusOptions />
        </section>

        <section className="filter-sheet__section">
          <p className="section-label">Sortiranje</p>
          <SortSelect wide />
        </section>

        <section className="filter-sheet__section">
          <p className="section-label">Oblast</p>
          <button
            type="button"
            className={`filter-btn filter-btn--block${filters.viewportOnly ? ' is-active' : ''}`}
            onClick={onToggleViewport}
            aria-pressed={filters.viewportOnly}
          >
            <MapPinned size={16} aria-hidden="true" />
            Samo vidljivi deo mape
          </button>
        </section>
      </div>
    </Modal>
  );
}

export function FiltersBar() {
  const { filters, updateFilters, resetFilters, mapRef } = useApp();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
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

  useEffect(() => {
    if (!isMobile) setSheetOpen(false);
  }, [isMobile]);

  const toggleCategory = (category: (typeof CATEGORIES)[number]['id']) => {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    updateFilters({ categories: next });
  };

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

  const sheetCount = filters.statuses.length + (filters.viewportOnly ? 1 : 0);
  const activeCount =
    filters.categories.length + sheetCount + (filters.query.trim() ? 1 : 0);

  return (
    <div className="filters">
      <div className="search-field">
        <Search size={16} aria-hidden="true" />
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
            <X size={14} aria-hidden="true" />
          </button>
        ) : isMobile ? null : (
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
              <CategoryGlyph category={category.id} size={14} />
              {category.shortLabel}
            </button>
          );
        })}
      </div>

      {isMobile ? (
        <div className="filter-tools">
          <button
            type="button"
            className={`filter-btn${sheetCount > 0 ? ' is-active' : ''}`}
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filteri
            {sheetCount > 0 ? <span className="filter-btn__count">{sheetCount}</span> : null}
          </button>
          {activeCount > 0 ? (
            <button type="button" className="link-btn" onClick={resetFilters}>
              Očisti sve
            </button>
          ) : null}
        </div>
      ) : (
        <div className="filter-tools">
          <StatusFilter />
          <SortSelect />

          <button
            type="button"
            className={`icon-btn${filters.viewportOnly ? ' is-active' : ''}`}
            onClick={toggleViewport}
            aria-pressed={filters.viewportOnly}
            title="Samo prijave na vidljivom delu mape"
            aria-label="Samo prijave na vidljivom delu mape"
          >
            <MapPinned size={16} aria-hidden="true" />
          </button>

          {activeCount > 0 ? (
            <button type="button" className="link-btn" onClick={resetFilters}>
              Očisti
            </button>
          ) : null}
        </div>
      )}

      {sheetOpen ? (
        <MobileFiltersSheet onClose={() => setSheetOpen(false)} onToggleViewport={toggleViewport} />
      ) : null}
    </div>
  );
}
