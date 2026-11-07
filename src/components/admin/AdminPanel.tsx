import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../../state/app-context';
import { Modal } from '../modals/Modal';
import { EmptyState } from '../ui/EmptyState';
import { UsersPanel } from './UsersPanel';

/** Admin-only account panel; actions are managed from the actions list/detail. */
export function AdminPanel() {
  const { auth, closeModal } = useApp();

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