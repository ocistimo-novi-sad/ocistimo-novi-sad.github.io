import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { LIMITS } from '../config';
import { isFirebaseConfigured } from '../services/firebase';
import { fetchReportsPage } from '../services/reports';
import { toSerbianError } from '../services/errors';
import { withTimeout } from '../lib/timeout';
import { loadDemoReports } from '../demo/store';
import type { Report } from '../types';

export type DataPhase = 'loading' | 'ready' | 'error';

/**
 * Reports data source. In demo mode the initial data is available immediately
 * and is clearly marked in the interface; with Firebase it is paginated and
 * limited to avoid unnecessary reads.
 */
export function useReports() {
  const [reports, setReports] = useState<Report[]>(() =>
    isFirebaseConfigured ? [] : loadDemoReports(),
  );
  const [phase, setPhase] = useState<DataPhase>(isFirebaseConfigured ? 'loading' : 'ready');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const currentGeneration = ++generation.current;

    if (!isFirebaseConfigured) {
      setReports(loadDemoReports());
      setPhase('ready');
      setError(null);
      setHasMore(false);
      cursorRef.current = null;
      return;
    }

    setPhase('loading');
    setError(null);

    try {
      const page = await withTimeout(fetchReportsPage(LIMITS.reportsPageSize));
      if (currentGeneration !== generation.current) return;
      setReports(page.reports);
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
      setPhase('ready');
    } catch (err) {
      if (currentGeneration !== generation.current) return;
      setError(toSerbianError(err, 'Prijave trenutno nisu dostupne.'));
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!isFirebaseConfigured || !hasMore || loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const page = await withTimeout(
        fetchReportsPage(LIMITS.reportsPageSize, cursorRef.current),
      );
      setReports((current) => {
        const seen = new Set(current.map((report) => report.id));
        return [...current, ...page.reports.filter((report) => !seen.has(report.id))];
      });
      cursorRef.current = page.cursor;
      setHasMore(page.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  const addReport = useCallback((report: Report) => {
    setReports((current) => [report, ...current]);
    setPhase('ready');
  }, []);

  const updateReport = useCallback((reportId: string, changes: Partial<Report>) => {
    setReports((current) =>
      current.map((report) => (report.id === reportId ? { ...report, ...changes } : report)),
    );
  }, []);

  /** Replaces a known report or adds one fetched outside the public pages. */
  const upsertReport = useCallback((next: Report) => {
    setReports((current) =>
      current.some((report) => report.id === next.id)
        ? current.map((report) => (report.id === next.id ? next : report))
        : [next, ...current],
    );
  }, []);

  const removeReport = useCallback((reportId: string) => {
    setReports((current) => current.filter((report) => report.id !== reportId));
  }, []);

  /** Keeps the person's public name visible without reloading the map (#161). */
  const renamePerson = useCallback((uid: string, publicName: string, scope: RenameScope) => {
    setReports((current) =>
      current.map((report) => renamedReport(report, uid, publicName, scope)),
    );
  }, []);

  return {
    reports,
    phase,
    error,
    hasMore,
    loadingMore,
    load,
    loadMore,
    addReport,
    updateReport,
    upsertReport,
    removeReport,
    renamePerson,
  };
}

/** Which of the person's name stamps were renamed in the database. */
export interface RenameScope {
  author: boolean;
  moderator: boolean;
}

/**
 * The report with the person's new public name in the stamps that were
 * renamed: "Autor prijave" and "Odobrio/Pregledao" (#161).
 */
export function renamedReport(
  report: Report,
  uid: string,
  publicName: string,
  scope: RenameScope,
): Report {
  const author = scope.author && report.createdBy === uid;
  const moderator =
    scope.moderator && report.moderatedBy === uid && report.moderatedByName !== undefined;
  if (!author && !moderator) return report;
  return {
    ...report,
    ...(author ? { createdByName: publicName } : {}),
    ...(moderator ? { moderatedByName: publicName } : {}),
  };
}
