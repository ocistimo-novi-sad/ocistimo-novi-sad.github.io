import { ShieldAlert } from 'lucide-react';
import { useApp } from '../../state/app-context';
import { Modal } from '../modals/Modal';
import { EmptyState } from '../ui/EmptyState';
import { ActionForm } from './ActionForm';

/**
 * The create/edit form can be opened directly from the Actions panel, the
 * mobile menu and the action details. The administration panel keeps the list
 * of all actions and the users tab.
 */
export function ActionFormDialog() {
  const {
    auth,
    modal,
    closeModal,
    reports,
    reloadActions,
    reloadReports,
    refreshModerationCounts,
  } = useApp();

  const action = modal?.kind === 'action-form' ? modal.action ?? null : null;

  if (!auth.isModerator) {
    return (
      <Modal title="Nova akcija" size="sm" onClose={closeModal}>
        <EmptyState
          icon={<ShieldAlert size={20} />}
          title="Nemaš pristup akcijama"
          description="Akcije čišćenja prave moderatori i administratori. Ulogu moderatora dodeljuje administrator."
          action={
            <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
              Zatvori
            </button>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={action ? 'Uredi akciju' : 'Nova akcija'}
      description="Akcije su javne i vidljive svim posetiocima. Sačuvaj tek kada su termin i mesto potvrđeni."
      size="xl"
      onClose={closeModal}
    >
      <ActionForm
        key={action?.id ?? 'new'}
        action={action}
        reports={reports}
        onCancel={closeModal}
        onSaved={() => {
          closeModal();
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
