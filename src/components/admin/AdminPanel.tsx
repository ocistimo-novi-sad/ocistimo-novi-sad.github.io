import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import { ACTION_STATUS_MAP } from '../../config';
import { formatDate, formatTime, plural } from '../../lib/format';
import { toSerbianError } from '../../services/errors';
import { updateActionStatus } from '../../services/actions';
import { useApp } from '../../state/app-context';
import type { CleanupAction } from '../../types';
import { Modal } from '../modals/Modal';
import { EmptyState, Spinner } from '../ui/EmptyState';
import { ActionForm } from './ActionForm';
import { UsersPanel } from './UsersPanel';

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
    notify,
  } = useApp();

  const initialEditId = modal?.kind === 'admin' ? modal.editActionId : undefined;
  const [tab, setTab] = useState<'actions' | 'users'>('actions');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CleanupAction | null>(null);
  const [confirming, setConfirming] = useState<{
    id: string;
    kind: 'cancel' | 'delete';
  } | null>(null);
  const [busy, setBusy] = useState(false);
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

  // Moderators (community coordinators) manage cleanup actions; only admins
  // also see "Korisnici i uloge".
  if (!auth.isModerator) {
    return (
      <Modal title="Akcije čišćenja" size="sm" onClose={closeModal}>
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
            // Saving an action also rewrites the status of its linked reports.
            void reloadActions();
            void reloadReports();
          }}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={auth.isAdmin ? 'Administracija' : 'Akcije čišćenja'}
      description={
        auth.isAdmin
          ? 'Akcije čišćenja, korisnici i uloge.'
          : 'Pravljenje, uređivanje i brisanje akcija čišćenja.'
      }
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
      {auth.isAdmin ? (
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
            aria-selected={tab === 'users'}
            className={`admin-tab${tab === 'users' ? ' is-active' : ''}`}
            onClick={() => setTab('users')}
          >
            Korisnici i uloge
          </button>
        </div>
      ) : null}

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
              description="Napravi prvu akciju i poveži je sa prijavama koje treba rešiti."
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
                    {confirming?.id === action.id ? (
                      <>
                        {confirming.kind === 'delete' ? (
                          <span className="delete-confirm__text">Trajno obrisati?</span>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() =>
                            void (confirming.kind === 'delete'
                              ? removeAction(action)
                              : cancelAction(action.id))
                          }
                          disabled={busy}
                        >
                          {busy ? (
                            <Spinner size={12} />
                          ) : confirming.kind === 'delete' ? (
                            <Trash2 size={12} aria-hidden="true" />
                          ) : (
                            <X size={12} aria-hidden="true" />
                          )}
                          {confirming.kind === 'delete' ? 'Obriši' : 'Potvrdi'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--quiet btn--sm"
                          onClick={() => setConfirming(null)}
                          disabled={busy}
                        >
                          Ne
                        </button>
                      </>
                    ) : (
                      <>
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
                        {action.status !== 'cancelled' && action.status !== 'completed' ? (
                          <button
                            type="button"
                            className="btn btn--quiet btn--sm"
                            onClick={() => setConfirming({ id: action.id, kind: 'cancel' })}
                          >
                            Otkaži
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn--quiet btn--sm"
                          onClick={() => setConfirming({ id: action.id, kind: 'delete' })}
                        >
                          <Trash2 size={12} aria-hidden="true" /> Obriši
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : auth.isAdmin ? (
        <UsersPanel />
      ) : null}
    </Modal>
  );
}
