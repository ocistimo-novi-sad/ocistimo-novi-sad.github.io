import { LocateFixed, X } from 'lucide-react';
import { useApp } from '../state/app-context';
import { Spinner } from './ui/EmptyState';

/** Orders the list by distance from the user; asks for the location on first use. */
export function NearMeButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: (on: boolean) => void;
}) {
  const { locating } = useApp();

  return (
    <button
      type="button"
      className={`near-btn${active ? ' is-active' : ''}`}
      onClick={() => onToggle(!active)}
      aria-pressed={active}
      aria-disabled={locating || undefined}
      title={active ? 'Vrati podrazumevani redosled' : 'Prikaži najbliže prvo'}
    >
      {locating ? <Spinner size={12} /> : <LocateFixed size={13} aria-hidden="true" />}
      <span>{active ? 'Najbliže prvo' : 'Blizu mene'}</span>
      {active && !locating ? <X size={12} aria-hidden="true" /> : null}
    </button>
  );
}
