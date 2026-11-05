import { useApp } from '../../state/app-context';
import { Modal } from '../modals/Modal';
import { ActionForm } from './ActionForm';

/** Opens the create/edit form directly, without the old action-list dialog. */
export function ActionDialog({ editActionId }: { editActionId?: string }) {
  const { actions, reports, closeModal, reloadActions, reloadReports } = useApp();
  const editing = editActionId
    ? actions.find((action) => action.id === editActionId) ?? null
    : null;

  return (
    <Modal
      title={editing ? 'Uredi akciju' : 'Nova akcija'}
      description="Akcije su javne i vidljive svim posetiocima. Sačuvaj tek kada su termin i mesto potvrđeni."
      size="xl"
      onClose={closeModal}
    >
      <ActionForm
        key={editing?.id ?? 'new'}
        action={editing}
        reports={reports}
        onCancel={closeModal}
        onSaved={() => {
          closeModal();
          // Saving an action also rewrites the status of its linked reports.
          void reloadActions();
          void reloadReports();
        }}
      />
    </Modal>
  );
}
