import { Marker, Tooltip } from 'react-leaflet';
import type { CleanupAction } from '../../types';
import { formatDate, formatTime } from '../../lib/format';
import { actionIcon } from './map-icons';

export function ActionMarkers({
  actions,
  selectedActionId,
  onSelect,
}: {
  actions: CleanupAction[];
  selectedActionId: string | null;
  onSelect: (action: CleanupAction) => void;
}) {
  return (
    <>
      {actions.map((action) => (
        <Marker
          key={action.id}
          position={[action.latitude, action.longitude]}
          icon={actionIcon(action.id === selectedActionId)}
          zIndexOffset={action.id === selectedActionId ? 950 : 400}
          bubblingMouseEvents={false}
          eventHandlers={{ click: () => onSelect(action) }}
        >
          <Tooltip direction="top" offset={[0, -20]} className="ns-tooltip">
            <span className="ns-tooltip__label">Akcija</span>
            <br />
            {action.title}
            <br />
            {formatDate(action.date)} u {formatTime(action.date)}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
