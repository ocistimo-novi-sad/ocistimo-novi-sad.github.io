import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { APP, CATEGORY_MAP, DEFAULT_FILTERS, STATUS_MAP } from '../config';
import { useAuth } from '../hooks/useAuth';
import { useReports } from '../hooks/useReports';
import { useActions } from '../hooks/useActions';
import { isWithinBounds } from '../lib/geo';
import { distanceInMeters } from '../lib/geo';
import { toSerbianError } from '../services/errors';
import { isFirebaseConfigured } from '../services/firebase';
import { updateReportStatus } from '../services/reports';
import {
  AppContext,
  type AppContextValue,
  type MobileTab,
  type ModalState,
  type Toast,
  type ToastTone,
} from './app-context';
import type { CleanupAction, Coordinates, Filters, Report, ReportStatus, View } from '../types';

type PendingIntent = { kind: 'create' } | { kind: 'flag'; reportId: string };

function fold(value: string): string {
  return value
    .toLocaleLowerCase('sr-Latn')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function boundsOfMap(map: LeafletMap): Filters['bounds'] {
  const bounds = map.getBounds();
  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const {
    reports,
    phase: reportsPhase,
    error: reportsError,
    hasMore: hasMoreReports,
    loadingMore: loadingMoreReports,
    load: loadReports,
    loadMore: loadMoreReportsRaw,
    addReport,
    updateReport,
  } = useReports();
  const {
    actions,
    phase: actionsPhase,
    error: actionsError,
    load: loadActions,
  } = useActions();

  const [view, setViewState] = useState<View>('map');
  const [mobileTab, setMobileTabState] = useState<MobileTab>('map');
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    categories: [],
    statuses: [],
    sort: DEFAULT_FILTERS.sort,
  }));
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeLocation, setComposeLocationState] = useState<Coordinates | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [userPosition, setUserPosition] = useState<
    (Coordinates & { accuracy: number }) | null
  >(null);
  const [locating, setLocating] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const pendingIntentRef = useRef<PendingIntent | null>(null);
  const toastTimers = useRef<Map<string, number>>(new Map());
  const toastCounter = useRef(0);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const notify = useCallback((tone: ToastTone, message: string) => {
    toastCounter.current += 1;
    const id = `toast-${toastCounter.current}`;
    setToasts((current) => [...current.slice(-2), { id, tone, message }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimers.current.delete(id);
    }, 5500);
    toastTimers.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimers.current.delete(id);
  }, []);

  const flyTo = useCallback(
    (
      coordinates: Coordinates,
      zoom: number = APP.focusZoom,
      options?: { accountForDrawer?: boolean },
    ) => {
      const map = mapRef.current;
      if (!map) return;

      // The detail/compose drawer overlays part of the map. Shift the target so
      // the pin stays in the area that is still visible: to the left on desktop,
      // above the bottom sheet on mobile.
      let projected = map.project([coordinates.latitude, coordinates.longitude], zoom);
      if (options?.accountForDrawer) {
        if (window.innerWidth > 900) {
          const drawerWidth = window.innerWidth > 1150 ? 428 : 384;
          projected = projected.add([drawerWidth / 2, 0]);
        } else {
          projected = projected.add([0, 220]);
        }
      }

      map.flyTo(map.unproject(projected, zoom), zoom, { duration: 0.65 });
    },
    [],
  );

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
    [reports, selectedReportId],
  );
  const selectedAction = useMemo(
    () => actions.find((action) => action.id === selectedActionId) ?? null,
    [actions, selectedActionId],
  );

  const relatedAction = useMemo(() => {
    if (!selectedReport) return null;
    const linked = actions.filter((action) => action.reportIds.includes(selectedReport.id));
    if (linked.length === 0) return null;
    const active = linked.find(
      (action) => action.status === 'planned' || action.status === 'in_progress',
    );
    return active ?? linked[0];
  }, [actions, selectedReport]);

  const actionReports = useMemo(() => {
    if (!selectedAction) return [];
    return selectedAction.reportIds
      .map((id) => reports.find((report) => report.id === id))
      .filter((report): report is Report => Boolean(report));
  }, [reports, selectedAction]);

  const filteredReports = useMemo(() => {
    const query = fold(filters.query.trim());
    const list = reports.filter((report) => {
      if (filters.categories.length > 0 && !filters.categories.includes(report.category)) {
        return false;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(report.status)) {
        return false;
      }
      if (filters.viewportOnly && filters.bounds) {
        if (!isWithinBounds(report, filters.bounds)) return false;
      }
      if (query) {
        const haystack = fold(
          [
            report.title,
            report.description,
            report.address ?? '',
            CATEGORY_MAP[report.category].label,
            STATUS_MAP[report.status].label,
          ].join(' '),
        );
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    switch (filters.sort) {
      case 'oldest':
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'nearest':
        if (userPosition) {
          list.sort(
            (a, b) => distanceInMeters(userPosition, a) - distanceInMeters(userPosition, b),
          );
        } else {
          list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        break;
      case 'status':
        list.sort((a, b) => {
          const difference = STATUS_MAP[a.status].weight - STATUS_MAP[b.status].weight;
          return difference !== 0
            ? difference
            : b.createdAt.getTime() - a.createdAt.getTime();
        });
        break;
      default:
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return list;
  }, [reports, filters, userPosition]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((current) => {
      const next: Filters = { ...current, ...patch };
      if (patch.viewportOnly === true && !next.bounds && mapRef.current) {
        next.bounds = boundsOfMap(mapRef.current);
      }
      if (patch.viewportOnly === false) {
        next.bounds = null;
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      categories: [],
      statuses: [],
      bounds: null,
    });
  }, []);

  const setView = useCallback((next: View) => {
    setViewState(next);
    setMobileTabState(next === 'actions' ? 'actions' : 'map');
    if (next === 'actions') {
      setSelectedReportId(null);
    }
  }, []);

  const setMobileTab = useCallback((tab: MobileTab) => {
    setMobileTabState(tab);
    setViewState(tab === 'actions' ? 'actions' : 'map');
    if (tab === 'actions') setSelectedReportId(null);
  }, []);

  const selectReport = useCallback(
    (report: Report, options?: { fly?: boolean }) => {
      setSelectedReportId(report.id);
      setSelectedActionId(null);
      // On mobile this makes the map the surface behind the detail sheet, and
      // it also makes sure report markers (not action markers) are rendered.
      setViewState('map');
      setMobileTabState('map');
      if (options?.fly !== false) flyTo(report, APP.focusZoom, { accountForDrawer: true });
    },
    [flyTo],
  );

  const selectAction = useCallback(
    (action: CleanupAction, options?: { fly?: boolean }) => {
      setSelectedActionId(action.id);
      setSelectedReportId(null);
      setViewState('actions');
      // Keep the map behind the mobile sheet so the meeting point is visible.
      setMobileTabState('map');
      if (options?.fly !== false) flyTo(action, APP.focusZoom, { accountForDrawer: true });
    },
    [flyTo],
  );

  const clearSelection = useCallback(() => {
    setSelectedReportId(null);
    setSelectedActionId(null);
  }, []);

  const openCompose = useCallback(() => {
    setSelectedReportId(null);
    setSelectedActionId(null);
    setComposeOpen(true);
    setComposeLocationState(null);
    setViewState('map');
    setMobileTabState('map');
  }, []);

  const startCompose = useCallback(() => {
    if (composeOpen) return;
    if (isFirebaseConfigured && !auth.user) {
      pendingIntentRef.current = { kind: 'create' };
      setModal({ kind: 'auth', intent: 'create' });
      return;
    }
    openCompose();
  }, [auth.user, composeOpen, openCompose]);

  const cancelCompose = useCallback(() => {
    setComposeOpen(false);
    setComposeLocationState(null);
  }, []);

  const setComposeLocation = useCallback((coordinates: Coordinates) => {
    setComposeLocationState(coordinates);
  }, []);

  const closeModal = useCallback(() => {
    pendingIntentRef.current = null;
    setModal(null);
  }, []);

  const requestFlag = useCallback(
    (reportId: string) => {
      if (!isFirebaseConfigured) {
        notify('info', 'Prijava sadržaja je dostupna kada je Firebase baza povezana.');
        return;
      }
      if (!auth.user) {
        pendingIntentRef.current = { kind: 'flag', reportId };
        setModal({ kind: 'auth', intent: 'flag' });
        return;
      }
      setModal({ kind: 'flag', reportId });
    },
    [auth.user, notify],
  );

  const handleSignedIn = useCallback(() => {
    const pending = pendingIntentRef.current;
    pendingIntentRef.current = null;
    if (pending?.kind === 'flag') {
      setModal({ kind: 'flag', reportId: pending.reportId });
      return;
    }
    setModal(null);
    if (pending?.kind === 'create') openCompose();
  }, [openCompose]);

  const addCreatedReport = useCallback(
    (report: Report) => {
      addReport(report);
      resetFilters();
      setComposeOpen(false);
      setComposeLocationState(null);
      setSelectedReportId(report.id);
      setSelectedActionId(null);
      setViewState('map');
      setMobileTabState('map');
      flyTo(report, APP.focusZoom, { accountForDrawer: true });
    },
    [addReport, flyTo, resetFilters],
  );

  const reloadReports = useCallback(async () => {
    await loadReports();
  }, [loadReports]);

  const loadMoreReports = useCallback(async () => {
    try {
      await loadMoreReportsRaw();
    } catch (error) {
      notify('error', toSerbianError(error, 'Dodatne prijave nije moguće učitati.'));
    }
  }, [loadMoreReportsRaw, notify]);

  const reloadActions = useCallback(async () => {
    await loadActions();
  }, [loadActions]);

  const moderateReport = useCallback(
    async (reportId: string, status: ReportStatus) => {
      try {
        await updateReportStatus(reportId, status);
        updateReport(reportId, { status, moderatedAt: new Date() });
        notify('success', 'Status prijave je ažuriran.');
      } catch (error) {
        notify('error', toSerbianError(error, 'Status nije moguće sačuvati.'));
        throw error;
      }
    },
    [notify, updateReport],
  );

  const locateUser = useCallback(() => {
    if (!('geolocation' in navigator)) {
      notify('error', 'Vaš pregledač ne podržava određivanje lokacije.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setUserPosition(coordinates);
        flyTo(coordinates, 15);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          notify('error', 'Pristup lokaciji je odbijen. Možete ga uključiti u podešavanjima pregledača.');
        } else {
          notify('error', 'Lokaciju trenutno nije moguće odrediti.');
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [flyTo, notify]);

  const value: AppContextValue = useMemo(
    () => ({
      auth,
      reports,
      filteredReports,
      reportsPhase,
      reportsError,
      hasMoreReports,
      loadingMoreReports,
      reloadReports,
      loadMoreReports,
      actions,
      actionsPhase,
      actionsError,
      reloadActions,
      filters,
      updateFilters,
      resetFilters,
      selectedReport,
      selectedAction,
      relatedAction,
      actionReports,
      selectReport,
      selectAction,
      clearSelection,
      closeSelection: clearSelection,
      view,
      setView,
      mobileTab,
      setMobileTab,
      composeOpen,
      composeLocation,
      startCompose,
      cancelCompose,
      setComposeLocation,
      modal,
      openModal: setModal,
      closeModal,
      requestFlag,
      onSignedIn: handleSignedIn,
      toasts,
      notify,
      dismissToast,
      addCreatedReport,
      moderateReport,
      mapRef,
      flyTo,
      userPosition,
      locating,
      locateUser,
    }),
    [
      auth,
      reports,
      filteredReports,
      reportsPhase,
      reportsError,
      hasMoreReports,
      loadingMoreReports,
      reloadReports,
      loadMoreReports,
      actions,
      actionsPhase,
      actionsError,
      reloadActions,
      filters,
      updateFilters,
      resetFilters,
      selectedReport,
      selectedAction,
      relatedAction,
      actionReports,
      selectReport,
      selectAction,
      clearSelection,
      view,
      setView,
      mobileTab,
      setMobileTab,
      composeOpen,
      composeLocation,
      startCompose,
      cancelCompose,
      setComposeLocation,
      modal,
      closeModal,
      requestFlag,
      handleSignedIn,
      toasts,
      notify,
      dismissToast,
      addCreatedReport,
      moderateReport,
      flyTo,
      userPosition,
      locating,
      locateUser,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
