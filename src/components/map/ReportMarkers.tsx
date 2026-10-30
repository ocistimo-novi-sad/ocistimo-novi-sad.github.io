import { useEffect, useMemo, useState } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import Supercluster from 'supercluster';
import { CATEGORIES, CATEGORY_MAP, STATUS_MAP } from '../../config';
import { formatRelativeTime, plural } from '../../lib/format';
import type { Category, Report } from '../../types';
import { clusterIcon, reportIcon, type CategoryCounts } from './map-icons';

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
    .map((category) => `${counts[category.id]} ${category.shortLabel}`)
    .join(' · ');
}

function ReportTooltipContent({ report }: { report: Report }) {
  const thumbnail = report.imageUrls[0];
  return (
    <div className="ns-tooltip__rich">
      {thumbnail ? (
        <img className="ns-tooltip__thumb" src={thumbnail} alt="" loading="lazy" />
      ) : null}
      <div className="ns-tooltip__body">
        <span className="ns-tooltip__label">
          {CATEGORY_MAP[report.category].shortLabel} · {STATUS_MAP[report.status].label}
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

const CLUSTER_MAX_ZOOM = 15;

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
      reports.map((report) => ({
        type: 'Feature' as const,
        properties: { reportId: report.id, category: report.category },
        geometry: {
          type: 'Point' as const,
          coordinates: [report.longitude, report.latitude],
        },
      })),
    );

    return cluster;
  }, [reports]);

  const features = useMemo(
    () => index.getClusters(viewport.bbox, Math.min(viewport.zoom, CLUSTER_MAX_ZOOM)),
    [index, viewport],
  );

  const reportsById = useMemo(
    () => new Map(reports.map((report) => [report.id, report])),
    [reports],
  );

  if (reports.length === 0) return null;

  return (
    <>
      {features.map((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        const properties = feature.properties as PointProps & CategoryCounts & ClusterMeta;

        if (properties.cluster && typeof properties.cluster_id === 'number') {
          const count = properties.point_count ?? 0;
          return (
            <Marker
              key={`cluster-${properties.cluster_id}`}
              position={[latitude, longitude]}
              icon={clusterIcon(count, properties)}
              zIndexOffset={200}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    index.getClusterExpansionZoom(properties.cluster_id as number),
                    18,
                  );
                  map.flyTo([latitude, longitude], expansionZoom, { duration: 0.5 });
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -18]} className="ns-tooltip">
                {count} {plural(count, 'prijava', 'prijave', 'prijava')} u ovoj oblasti.
                Kliknite da zumirate.
                <br />
                <span className="ns-tooltip__meta">{categoryBreakdown(properties)}</span>
              </Tooltip>
            </Marker>
          );
        }

        const report = reportsById.get(properties.reportId);
        if (!report) return null;

        return (
          <Marker
            key={report.id}
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
          </Marker>
        );
      })}

      {selectedReport ? (
        <Marker
          key={`selected-${selectedReport.id}`}
          position={[selectedReport.latitude, selectedReport.longitude]}
          icon={reportIcon(selectedReport, true)}
          zIndexOffset={900}
          bubblingMouseEvents={false}
          interactive={interactive}
          eventHandlers={{ click: () => onSelect(selectedReport) }}
        />
      ) : null}
    </>
  );
}
