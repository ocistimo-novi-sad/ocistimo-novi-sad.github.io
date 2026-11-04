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
import { isUpcomingAction } from '../lib/counts';
import { isWithinBounds } from '../lib/geo';
import { distanceInMeters } from '../lib/geo';
import { toSerbianError } from '../services/errors';
import { isFirebaseConfigured } from '../services/firebase';
import { deleteActionRecord } from '../services/actions';
import { droppedImages, removeImages } from '../services/images';
import {
  acceptEdit,
  approveReport as approveReportRecord,
  approveResolution,
  countEditedReports,
  countPendingReports,
  countPendingResolutions,
  deleteReportRecord,
  fetchMyReports,
  fetchReport,
  markResolved,
  rejectReport as rejectReportRecord,
  rejectResolution,
  revertEdit,
  submitResolution,
  updateOwnReport,
  updateReportAsModerator,
  updateReportStatus,
} from '../services/reports';
import {
  AppContext,
  type AppContextValue,
  type MobileTab,
  type ModalState,
  type Toast,
  type ToastTone,
} from './app-context';
import type {
  ActionScope,
  Category,
  CleanupAction,
  Coordinates,
  Filters,
  Layer,
  Report,
  ReportContent,
  ReportStatus,
  SortMode,
} from '../types';
import { drawerOffset } from '../components/map/drawer-offset';
import type { Snap } from '../components/Drawer';
import { prefersReducedMotion } from '../lib/motion';

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
    reports: storedReports,
    phase: reportsPhase,
    error: reportsError,
    hasMore: hasMoreReports,
    loadingMore: loadingMoreReports,
    load: loadReports,
    loadMore: loadMoreReportsRaw,
    addReport,
    updateReport,
    upsertReport,
    removeReport,
  } = useReports();

  // The signed-in author's own reports, published or not. Kept apart from the
  // public pages so a reload of the map does not drop them.
  const [myReports, setMyReports] = useState<Report[]>([]);

  // The store also holds unpublished reports a moderator or author opened.
  // Everything public (map, list, counts) sees approved reports only.
  const reports = useMemo(
    () => storedReports.filter((report) => report.moderation === 'approved'),
    [storedReports],
  );
  const knownReports = useMemo(() => {
    const ids = new Set(storedReports.map((report) => report.id));
    return [...storedReports, ...myReports.filter((report) => !ids.has(report.id))];
  }, [myReports, storedReports]);
  const myUnpublishedReports = useMemo(
    () => myReports.filter((report) => report.moderation !== 'approved'),
    [myReports],
  );
  const {
    actions,
    phase: actionsPhase,
    error: actionsError,
    load: loadActions,
  } = useActions();

  // A reload or a shared link keeps the layer and, on a phone, the list view.
  const [layer, setLayerState] = useState<Layer>(() =>
    new URLSearchParams(window.location.search).get('sloj') === 'akcije' ? 'actions' : 'reports',
  );
  const [mobileTab, setMobileTabState] = useState<MobileTab>(() =>
    new URLSearchParams(window.location.search).get('prikaz') === 'lista' ? 'list' : 'map',
  );
  const [actionScope, setActionScope] = useState<ActionScope>('upcoming');
  const [actionQuery, setActionQuery] = useState('');
  const [actionsNearest, setActionsNearestState] = useState(false);
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
  const [composeEditing, setComposeEditing] = useState<Report | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [userPosition, setUserPosition] = useState<
    (Coordinates & { accuracy: number }) | null
  >(null);
  const [locating, setLocating] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [editCount, setEditCount] = useState(0);
  const [resolutionCount, setResolutionCount] = useState(0);

  const mapRef = useRef<LeafletMap | null>(null);
  const pendingIntentRef = useRef<PendingIntent | null>(null);
  const toastTimers = useRef<Map<string, number>>(new Map());
  const toastCounter = useRef(0);
  const deepLinkRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get('prijava'),
  );
  const actionLinkRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get('akcija'),
  );
  // Moves the phone sheet, e.g. down to "peek" for "Prikaži na mapi".
  const [sheetRequest, setSheetRequest] = useState<{ snap: Snap; id: number }>();
  // The report form says here whether it has text that closing would lose.
  const composeGuardRef = useRef<(() => boolean) | null>(null);

  // Where the open panel was opened from, so closing it goes back there: the
  // list tab, the layer, or the action a report was opened from.
  const returnTo = useRef<{ tab: MobileTab; layer: Layer; actionId: string | null } | null>(null);
  const placeRef = useRef({
    mobileTab,
    layer,
    selectedReportId,
    selectedActionId,
    composeOpen,
  });
  placeRef.current = { mobileTab, layer, selectedReportId, selectedActionId, composeOpen };
  const rememberPlace = useCallback(() => {
    const place = placeRef.current;
    if (place.selectedReportId || place.selectedActionId || place.composeOpen) return;
    returnTo.current = { tab: place.mobileTab, layer: place.layer, actionId: null };
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Errors stay until closed. The rest go after 8 s, and wait while the pointer
  // or keyboard focus is on them, so nobody is rushed (WCAG 2.2.1).
  const toastsPaused = useRef(false);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;
  const startToastTimer = useCallback((id: string, ms: number) => {
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimers.current.delete(id);
    }, ms);
    toastTimers.current.set(id, timer);
  }, []);

  const notify = useCallback(
    (tone: ToastTone, message: string) => {
      toastCounter.current += 1;
      const id = `toast-${toastCounter.current}`;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      if (tone !== 'error' && !toastsPaused.current) startToastTimer(id, 8000);
    },
    [startToastTimer],
  );

  const pauseToasts = useCallback(() => {
    toastsPaused.current = true;
    toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    toastTimers.current.clear();
  }, []);

  const resumeToasts = useCallback(() => {
    toastsPaused.current = false;
    for (const toast of toastsRef.current) {
      if (toast.tone !== 'error' && !toastTimers.current.has(toast.id)) {
        startToastTimer(toast.id, 4000);
      }
    }
  }, [startToastTimer]);

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
      if (options?.accountForDrawer) projected = projected.add(drawerOffset());

      map.flyTo(map.unproject(projected, zoom), zoom, {
        duration: 0.65,
        animate: !prefersReducedMotion(),
      });
    },
    [],
  );

  const selectedReport = useMemo(
    () => knownReports.find((report) => report.id === selectedReportId) ?? null,
    [knownReports, selectedReportId],
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

  // "Upcoming" depends on the clock, so it is recomputed every few minutes; an
  // app left open moves an action that started hours ago to the past.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 5 * 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const { upcomingActions, pastActions } = useMemo(() => {
    // The same "upcoming" rule as every count (src/lib/counts.ts).
    const now = clock;
    const query = fold(actionQuery.trim());
    const isUpcoming = (action: CleanupAction) => isUpcomingAction(action, now);
    const matching = query
      ? actions.filter((action) =>
          fold(
            [action.title, action.description, action.meetingPoint, action.organizerName].join(
              ' ',
            ),
          ).includes(query),
        )
      : actions;
    const byDistance =
      actionsNearest && userPosition
        ? (a: CleanupAction, b: CleanupAction) =>
            distanceInMeters(userPosition, a) - distanceInMeters(userPosition, b)
        : null;
    return {
      upcomingActions: matching
        .filter(isUpcoming)
        .sort(byDistance ?? ((a, b) => a.date.getTime() - b.date.getTime())),
      pastActions: matching
        .filter((action) => !isUpcoming(action))
        .sort(byDistance ?? ((a, b) => b.date.getTime() - a.date.getTime())),
    };
  }, [actions, actionQuery, actionsNearest, userPosition, clock]);
  const filteredActions = actionScope === 'upcoming' ? upcomingActions : pastActions;

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

  const toggleCategory = useCallback((category: Category) => {
    setFilters((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      categories: [],
      statuses: [],
      bounds: null,
    });
  }, []);

  // Switching layers keeps map-or-list as it is and drops the selection
  // that belongs to the other layer.
  const setLayer = useCallback((next: Layer) => {
    setLayerState(next);
    if (next === 'actions') setSelectedReportId(null);
    else setSelectedActionId(null);
  }, []);

  const setMobileTab = useCallback((tab: MobileTab) => {
    setMobileTabState(tab);
  }, []);

  const selectReport = useCallback(
    (report: Report, options?: { fly?: boolean }) => {
      const place = placeRef.current;
      if (place.selectedActionId && !place.selectedReportId) {
        returnTo.current = {
          tab: returnTo.current?.tab ?? place.mobileTab,
          layer: returnTo.current?.layer ?? place.layer,
          actionId: place.selectedActionId,
        };
      } else {
        rememberPlace();
      }
      setSelectedReportId(report.id);
      setSelectedActionId(null);
      // On mobile this makes the map the surface behind the detail sheet, and
      // it also makes sure report markers (not action markers) are rendered.
      setLayerState('reports');
      setMobileTabState('map');
      if (options?.fly !== false) flyTo(report, APP.focusZoom, { accountForDrawer: true });
    },
    [flyTo, rememberPlace],
  );

  const selectAction = useCallback(
    (action: CleanupAction, options?: { fly?: boolean }) => {
      rememberPlace();
      setSelectedActionId(action.id);
      setSelectedReportId(null);
      setLayerState('actions');
      // Keep the map behind the mobile sheet so the meeting point is visible.
      setMobileTabState('map');
      if (options?.fly !== false) flyTo(action, APP.focusZoom, { accountForDrawer: true });
    },
    [flyTo, rememberPlace],
  );

  /** Closes the panel where it is, e.g. after a tap on the map. */
  const clearSelection = useCallback(() => {
    returnTo.current = null;
    setSelectedReportId(null);
    setSelectedActionId(null);
  }, []);

  /** Closes the panel (X, Escape, Back) and goes back to where it was opened. */
  const closeSelection = useCallback(() => {
    const back = returnTo.current;
    setSelectedReportId(null);
    if (back?.actionId) {
      setSelectedActionId(back.actionId);
      setLayerState('actions');
      returnTo.current = { ...back, actionId: null };
      return;
    }
    setSelectedActionId(null);
    returnTo.current = null;
    if (back) {
      setMobileTabState(back.tab);
      setLayerState(back.layer);
    }
  }, []);

  /**
   * ova funkcija sluzi da bi se nakon zahtjeva da se prikaze gdje je prijava izvrsena, 
   * dok na telefonu gasi prijavu i (nadam se) prikaze na mapi gdje je prijava.
   */
  const showReportOnMap = useCallback(
    (report: Report) => {
      // On a phone the sheet goes down to "peek" and stays open above the pin.
      if (window.innerWidth <= 900) {
        setSheetRequest((value) => ({ snap: 'peek', id: (value?.id ?? 0) + 1 }));
      }
      flyTo(report, APP.focusZoom, { accountForDrawer: true });
    },
    [flyTo],
  );

  const openCompose = useCallback(() => {
    rememberPlace();
    setSelectedReportId(null);
    setSelectedActionId(null);
    setComposeOpen(true);
    setComposeEditing(null);
    setComposeLocationState(null);
    setLayerState('reports');
    setMobileTabState('map');
  }, [rememberPlace]);

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
    setComposeEditing(null);
    setComposeLocationState(null);
    const back = returnTo.current;
    returnTo.current = null;
    if (back) {
      setMobileTabState(back.tab);
      setLayerState(back.layer);
    }
  }, []);

  /** Opens the report form prefilled with an existing report. */
  const editReport = useCallback((report: Report) => {
    rememberPlace();
    setSelectedReportId(null);
    setSelectedActionId(null);
    setModal(null);
    setComposeEditing(report);
    setComposeLocationState({ latitude: report.latitude, longitude: report.longitude });
    setComposeOpen(true);
    setLayerState('reports');
    setMobileTabState('map');
  }, [rememberPlace]);

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
      setLayerState('reports');
      setMobileTabState('map');
      flyTo(report, APP.focusZoom, { accountForDrawer: true });
    },
    [addReport, flyTo, resetFilters],
  );

  const signedInUid = auth.user?.uid ?? null;

  /** Puts a changed report everywhere it is known: the store and "my reports". */
  const applyReport = useCallback(
    (report: Report) => {
      upsertReport(report);
      if (report.createdBy && report.createdBy === signedInUid) {
        setMyReports((current) =>
          current.some((item) => item.id === report.id)
            ? current.map((item) => (item.id === report.id ? report : item))
            : [report, ...current],
        );
      }
    },
    [signedInUid, upsertReport],
  );

  const dropReport = useCallback(
    (reportId: string) => {
      removeReport(reportId);
      setMyReports((current) => current.filter((report) => report.id !== reportId));
      setSelectedReportId((current) => (current === reportId ? null : current));
    },
    [removeReport],
  );

  /** Keeps a just-created, still unpublished report without showing it. */
  const storeCreatedReport = useCallback(
    (report: Report) => {
      applyReport(report);
    },
    [applyReport],
  );

  const reloadMyReports = useCallback(async () => {
    if (!isFirebaseConfigured || !signedInUid) {
      setMyReports([]);
      return;
    }
    try {
      setMyReports(await fetchMyReports(signedInUid));
    } catch {
      // Not fatal: the public map still works; "Moje prijave" shows its own error.
    }
  }, [signedInUid]);

  useEffect(() => {
    void reloadMyReports();
  }, [reloadMyReports]);

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

  const deleteAction = useCallback(
    async (action: CleanupAction) => {
      try {
        await deleteActionRecord(action.id);
      } catch (error) {
        notify('error', toSerbianError(error, 'Akciju nije moguće obrisati.'));
        throw error;
      }
      setSelectedActionId((current) => (current === action.id ? null : current));
      void removeImages([
        ...new Set([
          ...(action.coverUrl ? [action.coverUrl] : []),
          ...(action.resultImageUrls ?? []),
        ]),
      ]);
      await loadActions();
      notify('success', 'Akcija je obrisana.');
    },
    [loadActions, notify],
  );

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

  const refreshModerationCounts = useCallback(async () => {
    if (!isFirebaseConfigured || !auth.isModerator) {
      setPendingCount(0);
      setEditCount(0);
      setResolutionCount(0);
      return;
    }
    try {
      const [pending, edits, resolutions] = await Promise.all([
        countPendingReports(),
        countEditedReports(),
        countPendingResolutions(),
      ]);
      setPendingCount(pending);
      setEditCount(edits);
      setResolutionCount(resolutions);
    } catch {
      // A badge is a hint only; the queue itself reports load errors.
    }
  }, [auth.isModerator]);

  useEffect(() => {
    void refreshModerationCounts();
  }, [refreshModerationCounts]);

  const approvePendingReport = useCallback(
    async (report: Report) => {
      try {
        await approveReportRecord(report.id);
      } catch (error) {
        notify('error', toSerbianError(error, 'Prijavu nije moguće odobriti.'));
        throw error;
      }
      applyReport({
        ...report,
        moderation: 'approved',
        rejectionReason: undefined,
        moderatedAt: new Date(),
        moderatedBy: auth.user?.uid,
        moderatedByName: auth.user?.displayName ?? undefined,
      });
      if (report.moderation === 'pending') {
        setPendingCount((count) => Math.max(0, count - 1));
      }
      notify('success', 'Prijava je odobrena i objavljena na mapi.');
    },
    [applyReport, auth.user, notify],
  );

  const rejectPendingReport = useCallback(
    async (report: Report, reason: string) => {
      try {
        await rejectReportRecord(report.id, reason);
      } catch (error) {
        notify('error', toSerbianError(error, 'Prijavu nije moguće odbiti.'));
        throw error;
      }

      applyReport({
        ...report,
        moderation: 'rejected',
        rejectionReason: reason,
        moderatedAt: new Date(),
        moderatedBy: auth.user?.uid,
        moderatedByName: auth.user?.displayName ?? undefined,
      });
      if (report.moderation === 'pending') {
        setPendingCount((count) => Math.max(0, count - 1));
      }
      notify('success', 'Prijava je odbijena. Autor vidi razlog u aplikaciji.');
    },
    [applyReport, auth.user, notify],
  );

  const moderatorStamp = useCallback(
    (): Partial<Report> => ({
      moderatedAt: new Date(),
      moderatedBy: auth.user?.uid,
      moderatedByName: auth.user?.displayName ?? undefined,
    }),
    [auth.user],
  );

  const submitReportEdit = useCallback(
    async (report: Report, content: ReportContent) => {
      let next: Report;
      let message: string;
      if (auth.isModerator) {
        await updateReportAsModerator(report.id, content);
        next = { ...report, ...content, ...moderatorStamp() };
        message = 'Izmene su sačuvane.';
      } else {
        const changes = await updateOwnReport(report, content);
        next = { ...report, ...changes };
        message =
          report.moderation === 'approved'
            ? 'Izmena je sačuvana i vidljiva. Moderator će je pregledati.'
            : 'Prijava je ispravljena i ponovo poslata na pregled.';
      }

      applyReport(next);
      // Photos the edit dropped, unless the kept approved version still shows them.
      void removeImages(
        droppedImages(report.imageUrls, [
          ...content.imageUrls,
          ...(next.previousVersion?.imageUrls ?? []),
        ]),
      );
      setComposeOpen(false);
      setComposeEditing(null);
      setComposeLocationState(null);
      setSelectedReportId(next.id);
      setSelectedActionId(null);
      setLayerState('reports');
      setMobileTabState('map');
      notify('success', message);
    },
    [applyReport, auth.isModerator, moderatorStamp, notify],
  );

  const deleteReport = useCallback(
    async (report: Report) => {
      try {
        await deleteReportRecord(report.id, auth.isModerator);
      } catch (error) {
        notify('error', toSerbianError(error, 'Prijavu nije moguće obrisati.'));
        throw error;
      }
      dropReport(report.id);
      void removeImages([
        ...new Set([
          ...report.imageUrls,
          ...(report.resolution?.imageUrls ?? []),
          ...(report.previousVersion?.imageUrls ?? []),
        ]),
      ]);
      if (auth.isModerator && report.moderation === 'pending') {
        setPendingCount((count) => Math.max(0, count - 1));
      }
      if (auth.isModerator && report.editReview === 'pending') {
        setEditCount((count) => Math.max(0, count - 1));
      }
      notify('success', 'Prijava je obrisana.');
    },
    [auth.isModerator, dropReport, notify],
  );

  const acceptReportEdit = useCallback(
    async (report: Report) => {
      try {
        await acceptEdit(report.id);
      } catch (error) {
        notify('error', toSerbianError(error, 'Izmenu nije moguće prihvatiti.'));
        throw error;
      }
      applyReport({
        ...report,
        editReview: undefined,
        previousVersion: undefined,
        ...moderatorStamp(),
      });
      // The approved version is gone, so are the photos only it used.
      void removeImages(
        droppedImages(report.previousVersion?.imageUrls ?? [], report.imageUrls),
      );
      setEditCount((count) => Math.max(0, count - 1));
      notify('success', 'Izmena je prihvaćena.');
    },
    [applyReport, moderatorStamp, notify],
  );

  const revertReportEdit = useCallback(
    async (report: Report) => {
      let restored: ReportContent;
      try {
        restored = await revertEdit(report.id);
      } catch (error) {
        notify('error', toSerbianError(error, 'Prethodnu verziju nije moguće vratiti.'));
        throw error;
      }
      applyReport({
        ...report,
        ...restored,
        editedAt: null,
        editReview: undefined,
        previousVersion: undefined,
        ...moderatorStamp(),
      });
      // Photos only the rolled-back edit used.
      void removeImages(droppedImages(report.imageUrls, restored.imageUrls));
      setEditCount((count) => Math.max(0, count - 1));
      notify('success', 'Vraćena je prethodna verzija prijave.');
    },
    [applyReport, moderatorStamp, notify],
  );

  const submitReportResolution = useCallback(
    async (report: Report, imageUrls: string[], note: string) => {
      const resolution = await submitResolution(report.id, imageUrls, note);
      applyReport({ ...report, resolution });
      // A new proof replaces a rejected one, with its photos.
      void removeImages(droppedImages(report.resolution?.imageUrls ?? [], imageUrls));
      notify('success', 'Hvala! Sanacija je poslata moderatoru na potvrdu.');
    },
    [applyReport, notify],
  );

  const approveReportResolution = useCallback(
    async (report: Report) => {
      try {
        await approveResolution(report.id);
      } catch (error) {
        notify('error', toSerbianError(error, 'Sanaciju nije moguće potvrditi.'));
        throw error;
      }
      applyReport({
        ...report,
        status: 'resolved',
        resolution: report.resolution
          ? {
              ...report.resolution,
              state: 'approved',
              rejectionReason: undefined,
              reviewedAt: new Date(),
              reviewedBy: auth.user?.uid,
            }
          : undefined,
        ...moderatorStamp(),
      });
      setResolutionCount((count) => Math.max(0, count - 1));
      notify('success', 'Sanacija je potvrđena. Prijava je rešena.');
    },
    [applyReport, auth.user, moderatorStamp, notify],
  );

  const rejectReportResolution = useCallback(
    async (report: Report, reason: string) => {
      try {
        await rejectResolution(report.id, reason);
      } catch (error) {
        notify('error', toSerbianError(error, 'Sanaciju nije moguće odbiti.'));
        throw error;
      }
      applyReport({
        ...report,
        resolution: report.resolution
          ? {
              ...report.resolution,
              state: 'rejected',
              rejectionReason: reason,
              reviewedAt: new Date(),
              reviewedBy: auth.user?.uid,
            }
          : undefined,
        ...moderatorStamp(),
      });
      setResolutionCount((count) => Math.max(0, count - 1));
      notify('success', 'Sanacija nije potvrđena. Autor vidi razlog u aplikaciji.');
    },
    [applyReport, auth.user, moderatorStamp, notify],
  );

  const markReportResolved = useCallback(
    async (report: Report) => {
      try {
        await markResolved(report.id);
      } catch (error) {
        notify('error', toSerbianError(error, 'Prijavu nije moguće označiti kao rešenu.'));
        throw error;
      }
      applyReport({
        ...report,
        status: 'resolved',
        resolution: {
          state: 'approved',
          imageUrls: [],
          note: '',
          byModerator: true,
          submittedAt: null,
          reviewedAt: new Date(),
          reviewedBy: auth.user?.uid,
        },
        ...moderatorStamp(),
      });
      if (report.resolution?.state === 'pending') {
        setResolutionCount((count) => Math.max(0, count - 1));
      }
      notify('success', 'Prijava je označena kao rešena.');
    },
    [applyReport, auth.user, moderatorStamp, notify],
  );

  // Deep link (?prijava=<id>) from shared links. Waits for auth so
  // authors and moderators can open reports that are not public yet.
  useEffect(() => {
    const reportId = deepLinkRef.current;
    if (!reportId || reportsPhase === 'loading' || !auth.ready) return;
    deepLinkRef.current = null;

    const clearLink = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('prijava');
      window.history.replaceState(null, '', url);
    };

    const known = knownReports.find((report) => report.id === reportId);
    if (known) {
      selectReport(known);
      return;
    }
    if (!isFirebaseConfigured) {
      clearLink();
      return;
    }

    fetchReport(reportId)
      .then((report) => {
        if (!report) {
          clearLink();
          notify('info', 'Prijava nije pronađena. Možda je obrisana.');
          return;
        }
        applyReport(report);
        selectReport(report);
      })
      .catch(() => {
        clearLink();
        notify(
          'info',
          auth.user
            ? 'Ova prijava još nije javna.'
            : 'Ova prijava još nije javna. Prijavi se ako si njen autor.',
        );
      });
  }, [applyReport, auth.ready, auth.user, knownReports, notify, reportsPhase, selectReport]);

  // Deep link to an action (?akcija=<id>), once the actions are loaded.
  useEffect(() => {
    const actionId = actionLinkRef.current;
    if (!actionId || actionsPhase === 'loading') return;
    actionLinkRef.current = null;
    const found = actions.find((action) => action.id === actionId);
    if (found) selectAction(found);
    else notify('info', 'Akcija nije pronađena. Možda je otkazana ili obrisana.');
  }, [actions, actionsPhase, notify, selectAction]);

  // --- Browser history -----------------------------------------------------
  // Opening a panel or a dialog adds a history entry, so Back closes it (and
  // Forward opens it again) instead of leaving the site. Each entry remembers
  // its place in `historyStack`; the address names what is open, so it can be
  // shared and survives a reload.
  const panelKey = [
    composeOpen
      ? `nova:${composeEditing?.id ?? ''}`
      : selectedReportId
        ? `prijava:${selectedReportId}`
        : selectedActionId
          ? `akcija:${selectedActionId}`
          : '',
    modal ? `dijalog:${modal.kind}` : '',
  ]
    .filter(Boolean)
    .join('|');
  const historyStack = useRef<string[]>(['']);
  const historyPos = useRef(0);
  // Set while history.go() runs for a panel closed with X, Escape or a tap.
  const historyGoing = useRef(false);

  const pageUrl = useMemo(() => {
    const url = new URL(window.location.href);
    for (const name of ['prijava', 'akcija', 'sloj', 'prikaz']) url.searchParams.delete(name);
    if (selectedReportId) url.searchParams.set('prijava', selectedReportId);
    else if (selectedActionId) url.searchParams.set('akcija', selectedActionId);
    else if (layer === 'actions') url.searchParams.set('sloj', 'akcije');
    if (mobileTab === 'list') url.searchParams.set('prikaz', 'lista');
    return url.href;
  }, [layer, mobileTab, selectedActionId, selectedReportId]);
  const latestHistory = useRef({ panelKey, pageUrl });
  latestHistory.current = { panelKey, pageUrl };

  useEffect(() => {
    if (deepLinkRef.current || actionLinkRef.current || historyGoing.current) return;
    const stack = historyStack.current;
    const pos = historyPos.current;
    const current = stack[pos] ?? '';
    if (panelKey === current) {
      if (pageUrl !== window.location.href) {
        window.history.replaceState({ kim: panelKey, pos }, '', pageUrl);
      }
      return;
    }
    const depth = (key: string) => (key ? key.split('|').length : 0);
    // Closed: go back to the entry that shows what is still open.
    if (depth(panelKey) < depth(current)) {
      const target = stack.lastIndexOf(panelKey, pos - 1);
      if (target >= 0) {
        historyGoing.current = true;
        window.history.go(target - pos);
        return;
      }
    }
    // Opened on top of what was there, or a report opened from its action.
    if (
      depth(panelKey) > depth(current) ||
      (current.startsWith('akcija:') && panelKey.startsWith('prijava:'))
    ) {
      stack.length = pos + 1;
      stack.push(panelKey);
      historyPos.current = pos + 1;
      window.history.pushState({ kim: panelKey, pos: pos + 1 }, '', pageUrl);
      return;
    }
    stack[pos] = panelKey;
    window.history.replaceState({ kim: panelKey, pos }, '', pageUrl);
  }, [pageUrl, panelKey]);

  // Back and Forward: show what the entry stands for.
  const applyHistory = useRef<(key: string) => void>(() => {});
  applyHistory.current = (key: string) => {
    const parts = key ? key.split('|') : [];
    const panel = parts.find((part) => !part.startsWith('dijalog:')) ?? '';
    const dialog = parts.find((part) => part.startsWith('dijalog:')) ?? '';
    // A dialog's contents can't be rebuilt from the address, so only closing is replayed.
    if (!dialog && modal) {
      pendingIntentRef.current = null;
      setModal(null);
    }
    const openPanel = latestHistory.current.panelKey.split('|')[0];
    if (panel === (openPanel.startsWith('dijalog:') ? '' : openPanel)) return;
    if (composeOpen) {
      // A form with text stays open and asks first; its entry comes back.
      if (composeGuardRef.current?.()) {
        const pos = historyPos.current + 1;
        historyStack.current.length = pos;
        historyStack.current.push(latestHistory.current.panelKey);
        historyPos.current = pos;
        window.history.pushState(
          { kim: latestHistory.current.panelKey, pos },
          '',
          latestHistory.current.pageUrl,
        );
        return;
      }
      cancelCompose();
    }
    if (!panel) {
      closeSelection();
      return;
    }
    const id = panel.slice(panel.indexOf(':') + 1);
    if (panel.startsWith('prijava:')) {
      const report = knownReports.find((item) => item.id === id);
      if (report) selectReport(report);
      else closeSelection();
    } else if (panel.startsWith('akcija:')) {
      const action = actions.find((item) => item.id === id);
      if (action) selectAction(action);
      else closeSelection();
    } else if (panel === 'nova:') {
      openCompose();
    }
  };

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { kim?: string; pos?: number } | null;
      const pos = state?.pos ?? 0;
      const key = state?.kim ?? '';
      historyPos.current = pos;
      historyStack.current[pos] = key;
      if (historyGoing.current) {
        // Our own go() after a close: the app already shows the right thing.
        historyGoing.current = false;
        const latest = latestHistory.current;
        historyStack.current[pos] = latest.panelKey;
        window.history.replaceState({ kim: latest.panelKey, pos }, '', latest.pageUrl);
        return;
      }
      applyHistory.current(key);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // The map's "my location" button flies there; sorting by distance only needs
  // the position, so it passes fly: false and the map stays where it is.
  const locateUser = useCallback(
    ({ fly = true }: { fly?: boolean } = {}) =>
      new Promise<boolean>((resolve) => {
        if (!('geolocation' in navigator)) {
          notify('error', 'Tvoj pregledač ne podržava određivanje lokacije.');
          resolve(false);
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
            if (fly) flyTo(coordinates, 15);
            resolve(true);
          },
          (error) => {
            setLocating(false);
            if (error.code === error.PERMISSION_DENIED) {
              notify(
                'error',
                'Pristup lokaciji je odbijen. Možeš ga uključiti u podešavanjima pregledača.',
              );
            } else {
              notify('error', 'Lokaciju trenutno nije moguće odrediti.');
            }
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
        );
      }),
    [flyTo, notify],
  );

  // "Nearest" without a known position asks for it; if that fails the order
  // goes back, so the list never claims "nearest" while it is not. A sort the
  // user picked while waiting for the position is kept.
  const setSort = useCallback(
    (sort: SortMode) => {
      updateFilters({ sort });
      if (sort !== 'nearest' || userPosition) return;
      void locateUser({ fly: false }).then((found) => {
        if (found) return;
        setFilters((current) =>
          current.sort === 'nearest' ? { ...current, sort: DEFAULT_FILTERS.sort } : current,
        );
      });
    },
    [locateUser, updateFilters, userPosition],
  );

  const setActionsNearest = useCallback(
    (on: boolean) => {
      setActionsNearestState(on);
      if (!on || userPosition) return;
      void locateUser({ fly: false }).then((found) => {
        if (!found) setActionsNearestState(false);
      });
    },
    [locateUser, userPosition],
  );

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
      deleteAction,
      upcomingActions,
      pastActions,
      filteredActions,
      actionScope,
      setActionScope,
      actionQuery,
      setActionQuery,
      actionsNearest,
      setActionsNearest,
      filters,
      updateFilters,
      setSort,
      toggleCategory,
      resetFilters,
      selectedReport,
      selectedAction,
      relatedAction,
      actionReports,
      selectReport,
      showReportOnMap,
      selectAction,
      clearSelection,
      closeSelection,
      sheetRequest,
      composeGuardRef,
      layer,
      setLayer,
      mobileTab,
      setMobileTab,
      composeOpen,
      composeLocation,
      composeEditing,
      startCompose,
      cancelCompose,
      setComposeLocation,
      editReport,
      submitReportEdit,
      deleteReport,
      myReports,
      myUnpublishedReports,
      reloadMyReports,
      modal,
      openModal: setModal,
      closeModal,
      requestFlag,
      onSignedIn: handleSignedIn,
      toasts,
      notify,
      dismissToast,
      pauseToasts,
      resumeToasts,
      addCreatedReport,
      storeCreatedReport,
      moderateReport,
      pendingCount,
      editCount,
      refreshModerationCounts,
      approvePendingReport,
      rejectPendingReport,
      acceptReportEdit,
      revertReportEdit,
      resolutionCount,
      submitReportResolution,
      approveReportResolution,
      rejectReportResolution,
      markReportResolved,
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
      deleteAction,
      upcomingActions,
      pastActions,
      filteredActions,
      actionScope,
      actionQuery,
      actionsNearest,
      setActionsNearest,
      filters,
      updateFilters,
      setSort,
      toggleCategory,
      resetFilters,
      selectedReport,
      selectedAction,
      relatedAction,
      actionReports,
      selectReport,
      showReportOnMap,
      selectAction,
      clearSelection,
      closeSelection,
      sheetRequest,
      layer,
      setLayer,
      mobileTab,
      setMobileTab,
      composeOpen,
      composeLocation,
      composeEditing,
      startCompose,
      cancelCompose,
      setComposeLocation,
      editReport,
      submitReportEdit,
      deleteReport,
      myReports,
      myUnpublishedReports,
      reloadMyReports,
      modal,
      closeModal,
      requestFlag,
      handleSignedIn,
      toasts,
      notify,
      dismissToast,
      pauseToasts,
      resumeToasts,
      addCreatedReport,
      storeCreatedReport,
      moderateReport,
      pendingCount,
      editCount,
      refreshModerationCounts,
      approvePendingReport,
      rejectPendingReport,
      acceptReportEdit,
      revertReportEdit,
      resolutionCount,
      submitReportResolution,
      approveReportResolution,
      rejectReportResolution,
      markReportResolved,
      flyTo,
      userPosition,
      locating,
      locateUser,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
