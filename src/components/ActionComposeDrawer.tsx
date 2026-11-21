import { useApp } from '../state/app-context';
import { ActionForm } from './admin/ActionForm';

/** The action form over the main map, opened like the report form (#184). */
export function ActionComposeDrawer() {
  const {
    composeEditingAction,
    cancelCompose,
    reports,
    reloadActions,
    reloadReports,
    refreshModerationCounts,
  } = useApp();

  return (
    <ActionForm
      variant="drawer"
      action={composeEditingAction}
      reports={reports}
      onCancel={cancelCompose}
      onSaved={() => {
        cancelCompose();
        // Saving an action also rewrites the status of its linked reports,
        // and a completed one confirms pending proofs ("Sanacije").
        void reloadActions();
        void reloadReports();
        void refreshModerationCounts();
      }}
    />
  );
}
