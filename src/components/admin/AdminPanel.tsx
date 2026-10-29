import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { ACTION_STATUS_MAP } from '../../config';
import { formatDate, formatTime, plural } from '../../lib/format';
import { toSerbianError } from '../../services/errors';
import { updateActionStatus } from '../../services/actions';
import { useApp } from '../../state/app-context';
import type { CleanupAction } from '../../types';
import { Modal } from '../modals/Modal';
import { EmptyState, Spinner } from '../ui/EmptyState';
import { ActionForm } from './ActionForm';
import { FlagsPanel } from './FlagsPanel';

export function AdminPanel() {
  const {
    auth,
    modal,
    closeModal,
    actions,
    reports,
    reloadActions,
    notify,
  } = useApp();

  const initialEditId = modal?.kind === 'admin' ? modal.editActionId : undefined;
  const [tab, setTab] = useState<'actions' | 'flags'>('actions');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CleanupAction | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!initialEditId || prefilled.current) return;
    const target = actions.find((action) => action.id === initialEditId);
    if (target) {
      prefilled.current = true;
      setEditing(target);
      setFormOpen(true);
    }
  }, [initialEditId, actions]);

  if (!auth.isAdmin) {
    return (
      <Modal title="Administracija" size="sm" onClose={closeModal}>
        <EmptyState
          icon={<ShieldAlert size={20} />}
          title="Nemate administratorski pristup"
          description="Administracija je dostupna samo nalozima upisanim u kolekciju admins u Firestore-u. Pristup se ne može dodeliti iz aplikacije."
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
    setCancelling(true);
    try {
      await updateActionStatus(actionId, 'cancelled');
      await reloadActions();
      notify('success', 'Akcija je otkazana.');
      setConfirmId(null);
    } catch (error) {
      notify('error', toSerbianError(error, 'Akciju nije moguće otkazati.'));
    } finally {
      setCancelling(false);
    }
  };

  if (formOpen) {
    return (
      <Modal
        title={editing ? 'Uredi akciju' : 'Nova akcija'}
        description="Akcije su javne i vidljive svim posetiocima. Sačuvajte tek kada su termin i mesto potvrđeni."
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
            void reloadActions();
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="Administracija"
      description="Moderacija prijava sadržaja i upravljanje akcijama čišćenja."
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
      <div className="admin-tabs" role="tablist" aria-label="Administracija">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'actions'}
          className={`admin-tab${tab === 'actions' ? ' is-active' : ''}`}
          onClick={() => setTab('actions')}
        >
          Akcije čišćenja <span>{actions.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'flags'}
          className={`admin-tab${tab === 'flags' ? ' is-active' : ''}`}
          onClick={() => setTab('flags')}
        >
          Prijave sadržaja
        </button>
      </div>

      {tab === 'actions' ? (
        <div className="admin-actions">
          <div className="admin-actions__head">
            <span className="eyebrow">Sve akcije</span>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={13} aria-hidden="true" /> Nova akcija
            </button>
          </div>

          {actions.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={20} />}
              title="Nema akcija"
              description="Napravite prvu akciju i povežite je sa prijavama koje treba rešiti."
            />
          ) : (
            <ul className="admin-action-list">
              {actions.map((action) => (
                <li key={action.id} className="admin-action-row">
                  <div className="admin-action-row__main">
                    <span className="admin-action-row__date">
                      {formatDate(action.date)} · {formatTime(action.date)}
                    </span>
                    <strong>{action.title}</strong>
                    <span className="admin-action-row__meta">
                      {ACTION_STATUS_MAP[action.status]} · {action.reportIds.length}{' '}
                      {plural(action.reportIds.length, 'prijava', 'prijave', 'prijava')}
                    </span>
                  </div>

                  <div className="admin-action-row__actions">
                    <button
                      type="button"
                      className="btn btn--quiet btn--sm"
                      onClick={() => {
                        setEditing(action);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil size={12} aria-hidden="true" /> Uredi
                    </button>

                    {confirmId === action.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => void cancelAction(action.id)}
                          disabled={cancelling}
                        >
                          {cancelling ? <Spinner size={12} /> : <X size={12} aria-hidden="true" />}
                          Potvrdi
                        </button>
                        <button
                          type="button"
                          className="btn btn--quiet btn--sm"
                          onClick={() => setConfirmId(null)}
                          disabled={cancelling}
                        >
                          Ne
                        </button>
                      </>
                    ) : action.status !== 'cancelled' && action.status !== 'completed' ? (
                      <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        onClick={() => setConfirmId(action.id)}
                      >
                        Otkaži
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <FlagsPanel />
      )}
    </Modal>
  );
}
