import { createDemoActions, createDemoReports } from './data';
import { AppError } from '../services/errors';
import type { CleanupAction, NewReportInput, Report } from '../types';

/**
 * Demo mode persistence: sample reports plus anything the visitor creates are
 * kept in localStorage only. The UI always labels this clearly.
 */

const STORAGE_KEY = 'ns-cisto.demo.reports.v1';

type StoredReport = Omit<Report, 'createdAt' | 'source'> & { createdAt: string };

function readStorage(): Report[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredReport => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as StoredReport).id === 'string' &&
          typeof (item as StoredReport).title === 'string'
        );
      })
      .map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        source: 'demo' as const,
        imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
      }))
      .filter((item) => Number.isFinite(item.createdAt.getTime()));
  } catch {
    return [];
  }
}

function writeStorage(reports: Report[]): boolean {
  try {
    const payload: StoredReport[] = reports.map((report) => ({
      ...report,
      createdAt: report.createdAt.toISOString(),
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Storage can be unavailable (private mode, quota). The caller reports
    // this to the visitor instead of claiming the demo report was saved.
    return false;
  }
}

export function loadDemoReports(): Report[] {
  const stored = readStorage();
  const seed = createDemoReports().filter(
    (report) => !stored.some((item) => item.id === report.id),
  );
  return [...stored, ...seed].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function addDemoReport(input: NewReportInput, imageUrls: string[]): Report {
  const report: Report = {
    id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title,
    description: input.description,
    category: input.category,
    status: 'new',
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address,
    createdByName: input.createdByName || 'Vi (demo)',
    createdAt: new Date(),
    createdBy: 'demo-local',
    imageUrls,
    source: 'demo',
  };

  const stored = readStorage();
  stored.unshift(report);
  if (!writeStorage(stored)) {
    throw new AppError(
      'demo/storage',
      'Demo prijava nije sačuvana jer pregledač blokira lokalno skladište. Dozvolite čuvanje podataka za ovaj sajt ili povežite Firebase.',
    );
  }
  return report;
}

export function loadDemoActions(): CleanupAction[] {
  return createDemoActions().sort((a, b) => a.date.getTime() - b.date.getTime());
}
