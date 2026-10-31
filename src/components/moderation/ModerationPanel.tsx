import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../../state/app-context';
import { Modal } from '../modals/Modal';
import { EmptyState } from '../ui/EmptyState';
import { EditsQueue } from './EditsQueue';
import { FlagsPanel } from './FlagsPanel';
import { ReviewQueue } from './ReviewQueue';

type ModerationTab = 'new' | 'edits' | 'flags';

export function ModerationPanel() {
  const { auth, closeModal, pendingCount, editCount, refreshModerationCounts } = useApp();
  const [tab, setTab] = useState<ModerationTab>('new');

  useEffect(() => {
    void refreshModerationCounts();
  }, [refreshModerationCounts]);

  if (!auth.isModerator) {
    return (
      <Modal title="Moderacija" size="sm" onClose={closeModal}>
        <EmptyState
          icon={<ShieldAlert size={20} />}
          title="Nemate pristup moderaciji"
          description="Moderaciju vide samo moderatori i administratori. Ulogu moderatora dodeljuje administrator."
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
      title="Moderacija"
      description="Nove prijave postaju javne tek kada ih odobrite."
      size="xl"
      onClose={closeModal}
      footer={
        <div className="modal-actions">
          <span className="modal-foot-note">
            <ShieldCheck size={12} aria-hidden="true" /> Svaka odluka se beleži uz vaš nalog.
          </span>
          <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
            Zatvori
          </button>
        </div>
      }
    >
      <div className="admin-tabs" role="tablist" aria-label="Moderacija">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'new'}
          className={`admin-tab${tab === 'new' ? ' is-active' : ''}`}
          onClick={() => setTab('new')}
        >
          Nove prijave {pendingCount > 0 ? <span>{pendingCount}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'edits'}
          className={`admin-tab${tab === 'edits' ? ' is-active' : ''}`}
          onClick={() => setTab('edits')}
        >
          Izmene {editCount > 0 ? <span>{editCount}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'flags'}
          className={`admin-tab${tab === 'flags' ? ' is-active' : ''}`}
          onClick={() => setTab('flags')}
        >
          Označen sadržaj
        </button>
      </div>

      {tab === 'new' ? <ReviewQueue /> : tab === 'edits' ? <EditsQueue /> : <FlagsPanel />}
    </Modal>
  );
}
