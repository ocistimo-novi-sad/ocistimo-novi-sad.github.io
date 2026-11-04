import { Suspense, lazy, useEffect } from 'react';
import { ActionsPanel } from './components/ActionsPanel';
import { ActionDetail } from './components/ActionDetail';
import { ComposeDrawer } from './components/ComposeDrawer';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { FiltersSheet } from './components/FiltersBar';
import { FirstVisitGuide } from './components/FirstVisitGuide';
import { useIsMobile } from './hooks/useMediaQuery';
import { Header } from './components/Header';
import { MapCanvas } from './components/MapCanvas';
import { MobileTabBar } from './components/MobileTabBar';
import { ReportDetail } from './components/ReportDetail';
import { ResultsAnnouncer } from './components/ResultsAnnouncer';
import { Toasts } from './components/Toasts';
import { AppProvider } from './state/AppProvider';
import { useApp } from './state/app-context';

// Dialogs open only after a tap, and the admin and moderation panels only for
// moderators, so their code loads then instead of with the first screen.
const AdminPanel = lazy(() =>
  import('./components/admin/AdminPanel').then((module) => ({ default: module.AdminPanel })),
);
const ModerationPanel = lazy(() =>
  import('./components/moderation/ModerationPanel').then((module) => ({
    default: module.ModerationPanel,
  })),
);
const MyReportsPanel = lazy(() =>
  import('./components/my/MyReportsPanel').then((module) => ({ default: module.MyReportsPanel })),
);
const AuthDialog = lazy(() =>
  import('./components/modals/AuthDialog').then((module) => ({ default: module.AuthDialog })),
);
const FlagDialog = lazy(() =>
  import('./components/modals/FlagDialog').then((module) => ({ default: module.FlagDialog })),
);
const InfoDialog = lazy(() =>
  import('./components/modals/InfoDialog').then((module) => ({ default: module.InfoDialog })),
);
const Lightbox = lazy(() =>
  import('./components/modals/Lightbox').then((module) => ({ default: module.Lightbox })),
);
const ResolveDialog = lazy(() =>
  import('./components/modals/ResolveDialog').then((module) => ({ default: module.ResolveDialog })),
);

function ModalHost() {
  const { modal, closeModal } = useApp();
  if (!modal) return null;

  switch (modal.kind) {
    case 'auth':
      return <AuthDialog intent={modal.intent} />;
    case 'flag':
      return <FlagDialog reportId={modal.reportId} />;
    case 'info':
      return <InfoDialog />;
    case 'admin':
      return <AdminPanel />;
    case 'moderation':
      return <ModerationPanel />;
    case 'my-reports':
      return <MyReportsPanel />;
    case 'resolve':
      return <ResolveDialog reportId={modal.reportId} />;
    case 'filters':
      return <FiltersSheet onClose={closeModal} />;
    case 'lightbox':
      return (
        <Lightbox
          images={modal.images}
          initialIndex={modal.index}
          onClose={closeModal}
        />
      );
    default:
      return null;
  }
}

function AppShell() {
  const { layer, mobileTab, selectedReport, selectedAction, composeOpen, composeEditing } =
    useApp();
  const isMobile = useIsMobile();
  const drawerOpen = composeOpen || Boolean(selectedReport) || Boolean(selectedAction);

  // The tab title names what is open, the specific part first (WCAG 2.4.2).
  useEffect(() => {
    document.title = composeOpen
      ? `${composeEditing ? 'Izmena prijave' : 'Nova prijava'} · Kuka i Motika`
      : selectedReport
        ? `${selectedReport.title} · Prijava · Kuka i Motika`
        : selectedAction
          ? `${selectedAction.title} · Akcija čišćenja · Kuka i Motika`
          : layer === 'actions'
            ? 'Akcije čišćenja · Kuka i Motika'
            : 'Kuka i Motika: mapa problema i akcija čišćenja';
  }, [composeOpen, composeEditing, selectedReport, selectedAction, layer]);

  return (
    <div className={`app${drawerOpen ? ' has-drawer' : ''}`}>
      <Header />

      <main className="workspace">
        <div className={`discovery${mobileTab === 'map' ? ' is-hidden-mobile' : ''}`}>
          {layer === 'actions' ? <ActionsPanel /> : <DiscoveryPanel />}
        </div>

        {/* On the phone's list tab the list covers the map, so the map's buttons
            and markers are left out of Tab and screen readers (WCAG 2.4.11). */}
        <div className="map-slot" inert={isMobile && mobileTab === 'list'}>
          <MapCanvas />
        </div>

        {composeOpen ? (
          // Keyed so switching between a new report and an edit starts fresh.
          <ComposeDrawer key={composeEditing?.id ?? 'new'} />
        ) : selectedReport ? (
          <ReportDetail />
        ) : selectedAction ? (
          <ActionDetail />
        ) : null}
      </main>

      <MobileTabBar />
      <FirstVisitGuide />
      <Toasts />
      <ResultsAnnouncer />
      <Suspense fallback={null}>
        <ModalHost />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
