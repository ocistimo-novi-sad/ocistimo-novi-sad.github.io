import { ActionsPanel } from './components/ActionsPanel';
import { ActionDetail } from './components/ActionDetail';
import { AdminPanel } from './components/admin/AdminPanel';
import { ComposeDrawer } from './components/ComposeDrawer';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { Header } from './components/Header';
import { MapCanvas } from './components/MapCanvas';
import { MobileTabBar } from './components/MobileTabBar';
import { ReportDetail } from './components/ReportDetail';
import { Toasts } from './components/Toasts';
import { AuthDialog } from './components/modals/AuthDialog';
import { FlagDialog } from './components/modals/FlagDialog';
import { InfoDialog } from './components/modals/InfoDialog';
import { Lightbox } from './components/modals/Lightbox';
import { AppProvider } from './state/AppProvider';
import { useApp } from './state/app-context';

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
  const { view, mobileTab, selectedReport, selectedAction, composeOpen } = useApp();
  const drawerOpen = composeOpen || Boolean(selectedReport) || Boolean(selectedAction);

  return (
    <div className={`app${drawerOpen ? ' has-drawer' : ''}`}>
      <Header />

      <main className="workspace">
        <div className={`discovery${mobileTab === 'map' ? ' is-hidden-mobile' : ''}`}>
          {view === 'actions' ? <ActionsPanel /> : <DiscoveryPanel />}
        </div>

        <div className="map-slot">
          <MapCanvas />
        </div>

        {composeOpen ? (
          <ComposeDrawer />
        ) : selectedReport ? (
          <ReportDetail />
        ) : selectedAction ? (
          <ActionDetail />
        ) : null}
      </main>

      <MobileTabBar />
      <Toasts />
      <ModalHost />
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
