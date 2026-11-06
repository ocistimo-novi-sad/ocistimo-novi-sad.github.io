import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LeafletMouseEvent, Map as LeafletMap } from 'leaflet';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Info,
  MapPinned,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { APP, CATEGORIES } from '../config';
import type { Category } from '../types';
import { useApp } from '../state/app-context';
import { useIsMobile } from '../hooks/useMediaQuery';
import { formatCoordinates } from '../lib/format';
import { isInServiceArea, roundCoordinate } from '../lib/geo';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { Spinner } from './ui/EmptyState';
import { ActiveFilters, FiltersButton, SEARCH_PLACEHOLDER, SearchInput } from './FiltersBar';
import { LayerSwitch } from './LayerSwitch';
import { DraftMarkers, ReportMarkers } from './map/ReportMarkers';
import { ActionMarkers } from './map/ActionMarkers';
import { tempIcon, userIcon } from './map/map-icons';
import { NamedMarker } from './map/NamedMarker';

function MapBridge() {
  const map = useMap();
  const { mapRef } = useApp();

  useEffect(() => {
    mapRef.current = map;
    map.attributionControl.setPrefix(false);

    const container = map.getContainer();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [map, mapRef]);

  return null;
}

function MapEvents({
  onMapClick,
  onMoveEnd,
  onZoomChange,
  onPointerMove,
}: {
  onMapClick: (latlng: { lat: number; lng: number }) => void;
  onMoveEnd: () => void;
  onZoomChange: (zoom: number) => void;
  onPointerMove: (latlng: { lat: number; lng: number } | null) => void;
}) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => onMapClick(event.latlng),
    moveend: () => onMoveEnd(),
    zoomend: (event) => onZoomChange(event.target.getZoom()),
    mousemove: (event: LeafletMouseEvent) => onPointerMove(event.latlng),
    mouseout: () => onPointerMove(null),
  });

  return null;
}

function mapBounds(map: LeafletMap) {
  const bounds = map.getBounds();
  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  };
}

export function MapCanvas() {
  const app = useApp();
  const isMobile = useIsMobile();
  const {
    filteredReports,
    reports,
    myUnpublishedReports,
    actions,
    filteredActions,
    actionScope,
    setActionScope,
    actionQuery,
    setActionQuery,
    layer,
    reportsPhase,
    reportsError,
    filters,
    updateFilters,
    toggleCategory,
    resetFilters,
    selectedReport,
    selectedAction,
    actionReports,
    selectReport,
    selectAction,
    clearSelection,
    composeOpen,
    composeLocation,
    setComposeLocation,
    startCompose,
    mapRef,
    notify,
    userPosition,
    locateUser,
    locating,
  } = app;

  const [zoom, setZoom] = useState<number>(APP.initialZoom);
  const [pointer, setPointer] = useState<{ lat: number; lng: number } | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const pointerThrottle = useRef(0);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {};
    for (const report of reports) {
      counts[report.category] = (counts[report.category] ?? 0) + 1;
    }
    return counts;
  }, [reports]);

  const handleMapClick = useCallback(
    (latlng: { lat: number; lng: number }) => {
      if (composeOpen) {
        const point = {
          latitude: roundCoordinate(latlng.lat),
          longitude: roundCoordinate(latlng.lng),
        };
        setComposeLocation(point);
        if (!isInServiceArea(point)) {
          notify('error', 'Izabrana tačka je izvan područja Novog Sada.');
        }
        return;
      }
      clearSelection();
    },
    [clearSelection, composeOpen, notify, setComposeLocation],
  );

  const handleMoveEnd = useCallback(() => {
    if (!filters.viewportOnly || !mapRef.current) return;
    updateFilters({ bounds: mapBounds(mapRef.current) });
  }, [filters.viewportOnly, mapRef, updateFilters]);

  const handlePointerMove = useCallback((latlng: { lat: number; lng: number } | null) => {
    if (!latlng) {
      setPointer(null);
      return;
    }
    const now = performance.now();
    if (now - pointerThrottle.current < 110) return;
    pointerThrottle.current = now;
    setPointer(latlng);
  }, []);

  const handleReportSelect = useCallback(
    (report: (typeof filteredReports)[number]) => {
      if (composeOpen) return;
      selectReport(report);
    },
    [composeOpen, selectReport],
  );

  const toggleViewport = () => {
    if (filters.viewportOnly) {
      updateFilters({ viewportOnly: false });
      return;
    }
    const bounds = mapRef.current ? mapBounds(mapRef.current) : null;
    updateFilters({ viewportOnly: true, bounds });
  };

  // The open action keeps its pin even when the search or period hides it.
  const visibleActions =
    selectedAction && !filteredActions.includes(selectedAction)
      ? [...filteredActions, selectedAction]
      : filteredActions;

  const noReports = reportsPhase === 'ready' && reports.length === 0;
  const noResults =
    reportsPhase === 'ready' && reports.length > 0 && filteredReports.length === 0;
  const showError = reportsPhase === 'error' && reports.length === 0;

  return (
    <div className={`map-shell${composeOpen ? ' is-picking' : ''}`}>
      <MapContainer
        center={[APP.center.latitude, APP.center.longitude]}
        zoom={APP.initialZoom}
        minZoom={11}
        maxZoom={19}
        zoomControl={false}
        className="map"
        worldCopyJump
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> saradnici'
          maxZoom={19}
        />
        <MapBridge />
        <MapEvents
          onMapClick={handleMapClick}
          onMoveEnd={handleMoveEnd}
          onZoomChange={setZoom}
          onPointerMove={handlePointerMove}
        />

        {userPosition ? (
          <>
            <Circle
              center={[userPosition.latitude, userPosition.longitude]}
              radius={Math.min(userPosition.accuracy, 250)}
              pathOptions={{ color: '#234C3B', weight: 1, fillOpacity: 0.08, opacity: 0.35 }}
            />
            <Marker
              position={[userPosition.latitude, userPosition.longitude]}
              icon={userIcon()}
              interactive={false}
              keyboard={false}
              zIndexOffset={500}
            />
          </>
        ) : null}

        {layer === 'reports' ? (
          <>
            <DraftMarkers
              reports={myUnpublishedReports}
              selectedReportId={selectedReport?.id ?? null}
              onSelect={handleReportSelect}
              interactive={!composeOpen}
            />
            <ReportMarkers
              reports={filteredReports}
              selectedReport={selectedReport}
              onSelect={handleReportSelect}
              interactive={!composeOpen}
            />
          </>
        ) : (
          <>
            {selectedAction && actionReports.length > 0 ? (
              <ReportMarkers
                reports={actionReports}
                selectedReport={selectedReport}
                onSelect={handleReportSelect}
              />
            ) : null}
            <ActionMarkers
              actions={visibleActions}
              selectedActionId={selectedAction?.id ?? null}
              onSelect={(action) => selectAction(action)}
            />
          </>
        )}

        {composeLocation ? (
          <NamedMarker
            label="Nova prijava. Pomeri marker."
            position={[composeLocation.latitude, composeLocation.longitude]}
            icon={tempIcon()}
            draggable
            autoPan
            zIndexOffset={1000}
            eventHandlers={{
              dragend: (event) => {
                const latlng = event.target.getLatLng();
                setComposeLocation({
                  latitude: roundCoordinate(latlng.lat),
                  longitude: roundCoordinate(latlng.lng),
                });
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -26]} className="ns-tooltip">
              Nova prijava. Pomeri marker.
            </Tooltip>
          </NamedMarker>
        ) : null}
      </MapContainer>

      {isMobile && !composeOpen ? (
        <div className="map-mobile-bar">
          <LayerSwitch />
          <div className="filters__row">
            {layer === 'reports' ? (
              <SearchInput
                value={filters.query}
                onChange={(query) => updateFilters({ query })}
                placeholder={SEARCH_PLACEHOLDER.reports}
                label="Pretraga prijava"
              />
            ) : (
              <SearchInput
                value={actionQuery}
                onChange={setActionQuery}
                placeholder={SEARCH_PLACEHOLDER.actions}
                label="Pretraga akcija"
              />
            )}
            <FiltersButton />
          </div>
          <ActiveFilters />
        </div>
      ) : null}

      {!isMobile && layer === 'reports' && !composeOpen ? (
        <div className="map-area-toggle">
          <button
            type="button"
            className={`map-area-btn${filters.viewportOnly ? ' is-active' : ''}`}
            onClick={toggleViewport}
            aria-pressed={filters.viewportOnly}
            title="Filtriraj prijave na trenutno vidljivi deo mape"
          >
            <MapPinned size={14} aria-hidden="true" />
            <span>{filters.viewportOnly ? 'Prikaz: ova oblast' : 'Samo ova oblast'}</span>
            {filters.viewportOnly ? <X size={13} aria-hidden="true" /> : null}
          </button>
        </div>
      ) : null}

      <div className="map-controls" role="group" aria-label="Kontrole mape">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Uvećaj prikaz"
          title="Uvećaj"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Umanji prikaz"
          title="Umanji"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() =>
            mapRef.current?.flyTo(
              [APP.center.latitude, APP.center.longitude],
              APP.initialZoom,
              { duration: 0.6 },
            )
          }
          aria-label="Prikaži ceo Novi Sad"
          title="Prikaži ceo grad"
        >
          <Compass size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void locateUser()}
          aria-label="Moja lokacija"
          title="Moja lokacija"
          aria-busy={locating}
          disabled={locating}
        >
          {locating ? <Spinner size={15} /> : <Navigation size={16} aria-hidden="true" />}
        </button>
      </div>

      {composeOpen ? (
        <div className="pick-banner" role="status">
          <Crosshair size={16} aria-hidden="true" />
          <div className="pick-banner__text">
            <strong>
              {composeLocation
                ? 'Klikni na drugu tačku da pomeriš marker'
                : 'Klikni na mapu da postaviš lokaciju'}
            </strong>
            {composeLocation ? (
              <span>{formatCoordinates(composeLocation.latitude, composeLocation.longitude)}</span>
            ) : (
              <span>Možeš i da prevučeš marker radi preciznijeg položaja.</span>
            )}
          </div>
        </div>
      ) : null}

      {reportsPhase === 'loading' ? (
        <div className="map-loading" role="status">
          <Spinner size={14} />
          <span>Učitavanje prijava…</span>
        </div>
      ) : null}

      {showError ? (
        <div className="map-state">
          <div className="map-state__card">
            <div className="map-state__icon is-alert">
              <TriangleAlert size={18} aria-hidden="true" />
            </div>
            <h2>Prijave nisu učitane</h2>
            <p>{reportsError ?? 'Proveri internet vezu i pokušaj ponovo.'}</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void app.reloadReports()}
            >
              <RefreshCw size={14} aria-hidden="true" /> Pokušaj ponovo
            </button>
          </div>
        </div>
      ) : null}

      {reportsError && reports.length > 0 ? (
        <div className="map-error-banner" role="status">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>Prijave nisu osvežene. Prikazani su poslednji učitani podaci.</span>
          <button type="button" onClick={() => void app.reloadReports()}>
            Pokušaj ponovo
          </button>
        </div>
      ) : null}

      {noReports && layer === 'reports' ? (
        <div className="map-state">
          <div className="map-state__card">
            <div className="map-state__icon">
              <MapPinned size={18} aria-hidden="true" />
            </div>
            <h2>Još nema prijava</h2>
            <p>
              Mapa je prazna. Prijavi prvi problem u svom kvartu i pomozi komšijama da ga
              pronađu.
            </p>
            <button type="button" className="btn btn--primary btn--sm" onClick={startCompose}>
              <Plus size={14} aria-hidden="true" /> Prijavi problem
            </button>
          </div>
        </div>
      ) : null}

      {noResults && layer === 'reports' ? (
        <div className="map-state">
          <div className="map-state__card">
            <div className="map-state__icon">
              <Search size={18} aria-hidden="true" />
            </div>
            <h2>Nema prijava za ove filtere</h2>
            <p>Nijedna prijava ne odgovara izabranim kategorijama, statusu ili pretrazi.</p>
            <button type="button" className="btn btn--quiet btn--sm" onClick={resetFilters}>
              Očisti filtere
            </button>
          </div>
        </div>
      ) : null}

      {!isMobile && legendOpen && layer === 'reports' ? (
        <div className="map-legend">
          <div className="map-legend__head">
            <span className="eyebrow">Legenda</span>
            <button
              type="button"
              onClick={() => setLegendOpen(false)}
              aria-label="Sakrij legendu"
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>
          <ul>
            {CATEGORIES.map((category) => {
              const active =
                filters.categories.length === 0 || filters.categories.includes(category.id);
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    className={`map-legend__item${active ? '' : ' is-off'}`}
                    onClick={() => toggleCategory(category.id)}
                    aria-pressed={filters.categories.includes(category.id)}
                    title={`Prikaži ili sakrij: ${category.label}`}
                  >
                    <span
                      className={`legend-swatch legend-swatch--${category.id}`}
                      data-category={category.id}
                    >
                      <CategoryGlyph category={category.id} size={11} />
                    </span>
                    <span className="map-legend__label">{category.label}</span>
                    <span className="map-legend__count">
                      {categoryCounts[category.id] ?? 0}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {filters.categories.length > 0 ? (
            <button
              type="button"
              className="map-legend__reset"
              onClick={() => updateFilters({ categories: [] })}
            >
              Prikaži sve
            </button>
          ) : null}
          <p className="map-legend__note">
            Klikni kategoriju da je uključiš ili isključiš. Tačka u uglu markera označava
            status prijave.
          </p>
        </div>
      ) : null}

      {!isMobile && !legendOpen && layer === 'reports' ? (
        <button
          type="button"
          className="map-legend-open"
          onClick={() => setLegendOpen(true)}
        >
          <ChevronUp size={13} aria-hidden="true" /> Legenda
        </button>
      ) : null}

      {!isMobile ? (
        <div className="map-readout" aria-hidden="true">
          <span className="map-readout__coords">
            {pointer
              ? formatCoordinates(pointer.lat, pointer.lng)
              : formatCoordinates(APP.center.latitude, APP.center.longitude)}
          </span>
          <span className="map-readout__sep" />
          <span>z{Math.round(zoom)}</span>
          <span className="map-readout__sep" />
          <span>OSM</span>
        </div>
      ) : null}

      {layer === 'actions' && visibleActions.length === 0 && app.actionsPhase === 'ready' ? (
        <div className="map-state">
          <div className="map-state__card">
            <div className="map-state__icon">
              <Info size={18} aria-hidden="true" />
            </div>
            {actions.length === 0 ? (
              <>
                <h2>Još nema akcija</h2>
                <p>Moderatori i koordinatori zajednice organizuju akcije čišćenja.</p>
              </>
            ) : actionQuery.trim() ? (
              <>
                <h2>Nema akcija za ovu pretragu</h2>
                <p>Pokušaj drugi naziv ili mesto okupljanja.</p>
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setActionQuery('')}
                >
                  Obriši pretragu
                </button>
              </>
            ) : actionScope === 'upcoming' ? (
              <>
                <h2>Nema predstojećih akcija</h2>
                <p>Moderatori i koordinatori zajednice organizuju akcije čišćenja.</p>
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setActionScope('past')}
                >
                  Pogledaj završene
                </button>
              </>
            ) : (
              <>
                <h2>Još nema završenih akcija</h2>
                <p>Kad se akcija završi, ovde se vidi sa svim rešenim prijavama.</p>
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setActionScope('upcoming')}
                >
                  Pogledaj predstojeće
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {layer === 'actions' && app.actionsError && actions.length === 0 ? (
        <div className="map-state">
          <div className="map-state__card">
            <div className="map-state__icon is-alert">
              <TriangleAlert size={18} aria-hidden="true" />
            </div>
            <h2>Akcije nisu učitane</h2>
            <p>{app.actionsError}</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void app.reloadActions()}
            >
              <RefreshCw size={14} aria-hidden="true" /> Pokušaj ponovo
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
