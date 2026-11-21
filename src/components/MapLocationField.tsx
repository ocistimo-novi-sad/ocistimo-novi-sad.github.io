import { useState } from 'react';
import { Crosshair, Navigation } from 'lucide-react';
import { APP } from '../config';
import { useApp } from '../state/app-context';
import type { Coordinates } from '../types';
import { Spinner } from './ui/EmptyState';

/**
 * The map behind a compose drawer picks the location. These two buttons lower
 * the drawer so the map can be used, and move the map to the picked point.
 * Pass `collapseSignal` to the Drawer.
 */
export function useDrawerMapFocus() {
  const { composeLocation, flyTo, mapRef, locateForCompose } = useApp();
  const [collapseSignal, setCollapseSignal] = useState(0);

  const focusMap = () => {
    setCollapseSignal((value) => value + 1);
    if (composeLocation) {
      flyTo(composeLocation, undefined, { accountForDrawer: true });
      return;
    }
    mapRef.current?.flyTo([APP.center.latitude, APP.center.longitude], 14, { duration: 0.5 });
  };

  const locateMe = () => {
    void locateForCompose().then((found) => {
      if (found) setCollapseSignal((value) => value + 1);
    });
  };

  return { collapseSignal, focusMap, locateMe };
}

/** The location card and "Koristi moju lokaciju", shared by the report and action forms. */
export function MapLocationField({
  buttonId,
  location,
  outsideArea,
  error,
  disabled,
  onFocusMap,
  onLocateMe,
}: {
  buttonId: string;
  location: Coordinates | null;
  outsideArea: boolean;
  error?: string;
  disabled: boolean;
  onFocusMap: () => void;
  onLocateMe: () => void;
}) {
  const { locating } = useApp();

  return (
    <>
      {/* The whole card opens the map, so the form needs no extra button (#38). */}
      <button
        type="button"
        id={buttonId}
        className={`location-pick${location ? ' is-set' : ''}${outsideArea ? ' is-error' : ''}`}
        onClick={onFocusMap}
        disabled={disabled}
      >
        <span className="location-pick__icon" aria-hidden="true">
          <Crosshair size={16} />
        </span>
        <span className="location-pick__body">
          <strong>{location ? 'Lokacija je izabrana' : 'Lokacija nije izabrana'}</strong>
          {location ? null : <span>Klikni na mapu da postaviš lokaciju</span>}
        </span>
      </button>

      <div className="location-actions">
        <button type="button" className="link-btn" onClick={onLocateMe} disabled={locating}>
          {locating ? <Spinner size={13} /> : <Navigation size={13} aria-hidden="true" />}
          {locating ? 'Traženje lokacije…' : 'Koristi moju lokaciju'}
        </button>
      </div>

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
      {outsideArea && !error ? (
        <p className="field__error" role="alert">
          Izabrana tačka je izvan Novog Sada.
        </p>
      ) : null}
    </>
  );
}
