import { Fragment, useEffect, useMemo, useState } from 'react';
import type { LatLng } from 'leaflet';
import { Polyline, Tooltip, useMap } from 'react-leaflet';
import Supercluster from 'supercluster';
import { CATEGORIES, CATEGORY_MAP, MODERATION_LABELS, STATUS_MAP } from '../../config';
import { formatRelativeTime, plural } from '../../lib/format';
import { optimizedImageUrl } from '../../services/images';
import type { Category, Report } from '../../types';
import { clusterIcon, draftIcon, reportIcon, type CategoryCounts } from './map-icons';
import { NamedMarker } from './NamedMarker';

interface PointProps {
  reportId: string;
  category: Category;
}

interface ClusterMeta {
  cluster?: boolean;
  cluster_id?: number;
  point_count?: number;
}

function categoryBreakdown(counts: CategoryCounts): string {
  return CATEGORIES.filter((category) => (counts[category.id] ?? 0) > 0)
    .map((category) => `${counts[category.id]} ${category.label}`)
    .join(' · ');
}

function ReportTooltipContent({ report }: { report: Report }) {
  const thumbnail = report.imageUrls[0];
  return (
    <div className="ns-tooltip__rich">
      {thumbnail ? (
        <img
          className="ns-tooltip__thumb"
          src={optimizedImageUrl(thumbnail, 160)}
          alt=""
          loading="lazy"
        />
      ) : null}
      <div className="ns-tooltip__body">
        <span className="ns-tooltip__label">
          {CATEGORY_MAP[report.category].label} · {STATUS_MAP[report.status].label}
        </span>
        <strong className="ns-tooltip__title">{report.title}</strong>
        <span className="ns-tooltip__meta">
          {report.address ? `${report.address} · ` : ''}
          {formatRelativeTime(report.createdAt)}
        </span>
      </div>
    </div>
  );
}

interface ReportMarkersProps {
  reports: Report[];
  selectedReport: Report | null;
  onSelect: (report: Report) => void;
  interactive?: boolean;
}

const CLUSTER_MAX_ZOOM = 20;

/** A group whose reports are shown around it, because zooming in no longer separates them. */
interface Spread {
  clusterId: number;
  latitude: number;
  longitude: number;
}

interface SpreadLeaf {
  report: Report;
  position: LatLng;
}

/**
 * Markers with Supercluster-based grouping for dense areas. At zoom 16+ the
 * individual reports are always visible, which is also where the map flies
 * when a report is selected.
 */
export function ReportMarkers({
  reports,
  selectedReport,
  onSelect,
  interactive = true,
}: ReportMarkersProps) {
  const map = useMap();
  const [viewport, setViewport] = useState<{ bbox: [number, number, number, number]; zoom: number }>(
    () => {
      const bounds = map.getBounds();
      return {
        bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: Math.round(map.getZoom()),
      };
    },
  );

  useEffect(() => {
    const update = () => {
      const bounds = map.getBounds();
      setViewport({
        bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom: Math.round(map.getZoom()),
      });
    };
    update();
    map.on('moveend', update);
    map.on('zoomend', update);
    return () => {
      map.off('moveend', update);
      map.off('zoomend', update);
    };
  }, [map]);

  // The open report is drawn once, on its own (below), so it stays out of the
  // groups. Otherwise its group was drawn under it as well (#61).
  const selectedId = selectedReport?.id ?? null;

  const index = useMemo(() => {
    // Counts stay flat (one key per category) because Supercluster only
    // shallow-clones properties before reducing.
    const cluster = new Supercluster<PointProps, CategoryCounts>({
      radius: 58,
      maxZoom: CLUSTER_MAX_ZOOM,
      minPoints: 2,
      map: (props) => ({ [props.category]: 1 }),
      reduce: (accumulated, props) => {
        for (const category of CATEGORIES) {
          const value = props[category.id];
          if (value) accumulated[category.id] = (accumulated[category.id] ?? 0) + value;
        }
      },
    });

    cluster.load(
      reports
        .filter((report) => report.id !== selectedId)
        .map((report) => ({
          type: 'Feature' as const,
          properties: { reportId: report.id, category: report.category },
          geometry: {
            type: 'Point' as const,
            coordinates: [report.longitude, report.latitude],
          },
        })),
    );

    return cluster;
  }, [reports, selectedId]);

  const features = useMemo(
    () => index.getClusters(viewport.bbox, Math.min(viewport.zoom, CLUSTER_MAX_ZOOM)),
    [index, viewport],
  );

  const reportsById = useMemo(
    () => new Map(reports.map((report) => [report.id, report])),
    [reports],
  );

  const [spread, setSpread] = useState<Spread | null>(null);

  // New reports or filters make an open group meaningless.
  useEffect(() => setSpread(null), [index]);

  useEffect(() => {
    if (!spread) return;
    const close = () => setSpread(null);
    map.on('click', close);
    map.on('zoomstart', close);
    return () => {
      map.off('click', close);
      map.off('zoomstart', close);
    };
  }, [map, spread]);

  // The group's reports on a circle around it, with room for every marker.
  const spreadLeaves = useMemo((): SpreadLeaf[] => {
    if (!spread) return [];
    let leaves;
    try {
      leaves = index.getLeaves(spread.clusterId, 24);
    } catch {
      return [];
    }
    const center = map.latLngToContainerPoint([spread.latitude, spread.longitude]);
    const radius = Math.max(52, leaves.length * 11);
    return leaves.flatMap((leaf, position) => {
      const report = reportsById.get((leaf.properties as PointProps).reportId);
      if (!report) return [];
      const angle = -Math.PI / 2 + (position * 2 * Math.PI) / leaves.length;
      return [
        {
          report,
          position: map.containerPointToLatLng([
            center.x + radius * Math.cos(angle),
            center.y + radius * Math.sin(angle),
          ]),
        },
      ];
    });
  }, [spread, index, map, reportsById]);

  if (reports.length === 0) return null;

  return (
    <>
      {features.map((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        const properties = feature.properties as PointProps & CategoryCounts & ClusterMeta;

        if (properties.cluster && typeof properties.cluster_id === 'number') {
          const count = properties.point_count ?? 0;
          return (
            <NamedMarker
              key={`cluster-${properties.cluster_id}`}
              label={`${count} ${plural(count, 'prijava', 'prijave', 'prijava')} u ovoj oblasti`}
              position={[latitude, longitude]}
              icon={clusterIcon(count, properties)}
              zIndexOffset={200}
              eventHandlers={{
                click: (event) => {
                  const clusterId = properties.cluster_id as number;
                  const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
                  // Zooming in would not separate these reports, so spread them out instead.
                  if (map.getZoom() >= CLUSTER_MAX_ZOOM || expansionZoom <= map.getZoom()) {
                    setSpread((current) =>
                      current?.clusterId === clusterId ? null : { clusterId, latitude, longitude },
                    );
                    // The group's label would cover the report spread above it.
                    event.target.closeTooltip();
                    return;
                  }
                  map.flyTo([latitude, longitude], expansionZoom, { duration: 0.5 });
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -18]} className="ns-tooltip">
                {count} {plural(count, 'prijava', 'prijave', 'prijava')} u ovoj oblasti.{' '}
                {viewport.zoom >= CLUSTER_MAX_ZOOM ? 'Klikni da ih raširiš.' : 'Klikni da zumiraš.'}
                <br />
                <span className="ns-tooltip__meta">{categoryBreakdown(properties)}</span>
              </Tooltip>
            </NamedMarker>
          );
        }

        const report = reportsById.get(properties.reportId);
        if (!report) return null;

        return (
          <NamedMarker
            key={report.id}
            label={report.title}
            position={[report.latitude, report.longitude]}
            icon={reportIcon(report)}
            zIndexOffset={300}
            bubblingMouseEvents={false}
            interactive={interactive}
            eventHandlers={{
              click: () => {
                if (interactive) onSelect(report);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -18]} className="ns-tooltip ns-tooltip--rich">
              <ReportTooltipContent report={report} />
            </Tooltip>
          </NamedMarker>
        );
      })}

      {spread
        ? spreadLeaves.map(({ report, position }) => (
            <Fragment key={`spread-${report.id}`}>
              <Polyline
                positions={[[spread.latitude, spread.longitude], position]}
                pathOptions={{ color: '#234c3b', weight: 1.5, opacity: 0.7 }}
                interactive={false}
              />
              <NamedMarker
                label={report.title}
                position={position}
                icon={reportIcon(report)}
                zIndexOffset={1000}
                bubblingMouseEvents={false}
                interactive={interactive}
                eventHandlers={{
                  click: () => {
                    if (interactive) onSelect(report);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -18]} className="ns-tooltip ns-tooltip--rich">
                  <ReportTooltipContent report={report} />
                </Tooltip>
              </NamedMarker>
            </Fragment>
          ))
        : null}

      {selectedReport ? (
        <NamedMarker
          key={`selected-${selectedReport.id}`}
          label={selectedReport.title}
          position={[selectedReport.latitude, selectedReport.longitude]}
          icon={
            selectedReport.moderation === 'approved'
              ? reportIcon(selectedReport, true)
              : draftIcon(selectedReport.category, true)
          }
          zIndexOffset={900}
          bubblingMouseEvents={false}
          interactive={interactive}
          eventHandlers={{ click: () => onSelect(selectedReport) }}
        />
      ) : null}
    </>
  );
}

/**
 * The signed-in author's reports that are not public yet. Few and never
 * clustered, drawn hollow so they cannot be mistaken for published ones.
 */
export function DraftMarkers({
  reports,
  selectedReportId,
  onSelect,
  interactive = true,
}: {
  reports: Report[];
  selectedReportId: string | null;
  onSelect: (report: Report) => void;
  interactive?: boolean;
}) {
  return (
    <>
      {reports
        .filter((report) => report.id !== selectedReportId)
        .map((report) => (
          <NamedMarker
            key={`draft-${report.id}`}
            label={report.title}
            position={[report.latitude, report.longitude]}
            icon={draftIcon(report.category)}
            zIndexOffset={250}
            bubblingMouseEvents={false}
            interactive={interactive}
            eventHandlers={{
              click: () => {
                if (interactive) onSelect(report);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -18]} className="ns-tooltip">
              <span className="ns-tooltip__label">{MODERATION_LABELS[report.moderation].label}</span>
              <br />
              <strong>{report.title}</strong>
              <br />
              <span className="ns-tooltip__meta">Vidiš je samo ti i moderatori.</span>
            </Tooltip>
          </NamedMarker>
        ))}
    </>
  );
}
