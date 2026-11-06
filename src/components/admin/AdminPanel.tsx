import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../../state/app-context';
import { Modal } from '../modals/Modal';
import { EmptyState } from '../ui/EmptyState';
import { UsersPanel } from './UsersPanel';

/** Admin-only account panel; actions are managed from the actions list/detail. */
export function AdminPanel() {
  const {
    auth,
    modal,
    closeModal,
    actions,
    reports,
    reloadActions,
    deleteAction,
    reloadReports,
    refreshModerationCounts,
    notify,
  } = useApp();

  if (!auth.isAdmin) {
    return (
      <Modal title="Administracija" size="sm" onClose={closeModal}>
        <EmptyState
          icon={<ShieldAlert size={20} />}
          title="Nemaš pristup administraciji"
          description="Korisnicima i ulogama upravlja administrator."
          action={
            <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
              Zatvori
            </button>
          }
        />
      </Modal>
    );
  }

  const cancelAction = async (actionId: string) => {
    setBusy(true);
    try {
      await updateActionStatus(actionId, 'cancelled');
      // Cancelling also puts its reports back to their earlier status.
      await Promise.all([reloadActions(), reloadReports()]);
      notify('success', 'Akcija je otkazana.');
      setConfirming(null);
    } catch (error) {
      notify('error', toSerbianError(error, 'Akciju nije moguće otkazati.'));
    } finally {
      setBusy(false);
    }
  };

  const removeAction = async (action: CleanupAction) => {
    setBusy(true);
    try {
      await deleteAction(action);
      setConfirming(null);
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  if (formOpen) {
    return (
      <Modal
        title={editing ? 'Uredi akciju' : 'Nova akcija'}
        description="Akcije su javne i vidljive svim posetiocima. Sačuvaj tek kada su termin i mesto potvrđeni."
        size="xl"
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        <ActionForm
          key={editing?.id ?? 'new'}
          action={editing}
          reports={reports}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            // Saving an action also rewrites the status of its linked reports,
            // and a completed one confirms pending proofs ("Sanacije").
            void reloadActions();
            void reloadReports();
            void refreshModerationCounts();
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="Administracija"
      description="Korisnici i uloge."
      size="lg"
      onClose={closeModal}
      footer={
        <div className="modal-actions">
          <span className="modal-foot-note">
            <ShieldCheck size={12} aria-hidden="true" /> Pristup je ograničen Firestore pravilima.
          </span>
          <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
            Zatvori
          </button>
        </div>
      }
    >
      <UsersPanel />
    </Modal>
  );
}
