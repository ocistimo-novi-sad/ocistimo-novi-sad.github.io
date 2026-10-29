import { createContext, useContext } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { useAuth } from '../hooks/useAuth';
import type { DataPhase } from '../hooks/useReports';
import type {
  CleanupAction,
  Coordinates,
  Filters,
  Report,
  ReportStatus,
  View,
} from '../types';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

export type ModalState =
  | { kind: 'auth'; intent: 'create' | 'flag' | 'generic' }
  | { kind: 'flag'; reportId: string }
  | { kind: 'info' }
  | { kind: 'admin'; editActionId?: string }
  | { kind: 'lightbox'; images: string[]; index: number }
  | null;

export type MobileTab = 'map' | 'reports' | 'actions';

export interface AppContextValue {
  auth: ReturnType<typeof useAuth>;

  reports: Report[];
  filteredReports: Report[];
  reportsPhase: DataPhase;
  reportsError: string | null;
  hasMoreReports: boolean;
  loadingMoreReports: boolean;
  reloadReports: () => Promise<void>;
  loadMoreReports: () => Promise<void>;

  actions: CleanupAction[];
  actionsPhase: DataPhase;
  actionsError: string | null;
  reloadActions: () => Promise<void>;

  filters: Filters;
  updateFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  selectedReport: Report | null;
  selectedAction: CleanupAction | null;
  relatedAction: CleanupAction | null;
  actionReports: Report[];
  selectReport: (report: Report, options?: { fly?: boolean }) => void;
  selectAction: (action: CleanupAction, options?: { fly?: boolean }) => void;
  clearSelection: () => void;
  closeSelection: () => void;

  view: View;
  setView: (view: View) => void;
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;

  composeOpen: boolean;
  composeLocation: Coordinates | null;
  startCompose: () => void;
  cancelCompose: () => void;
  setComposeLocation: (coordinates: Coordinates) => void;

  modal: ModalState;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  requestFlag: (reportId: string) => void;
  onSignedIn: () => void;

  toasts: Toast[];
  notify: (tone: ToastTone, message: string) => void;
  dismissToast: (id: string) => void;

  addCreatedReport: (report: Report) => void;
  moderateReport: (reportId: string, status: ReportStatus) => Promise<void>;

  mapRef: React.RefObject<LeafletMap | null>;
  flyTo: (
    coordinates: Coordinates,
    zoom?: number,
    options?: { accountForDrawer?: boolean },
  ) => void;
  userPosition: (Coordinates & { accuracy: number }) | null;
  locating: boolean;
  locateUser: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside <AppProvider>.');
  }
  return context;
}
