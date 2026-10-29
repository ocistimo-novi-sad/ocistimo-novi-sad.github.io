import { useCallback, useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../services/firebase';
import { fetchActions } from '../services/actions';
import { toSerbianError } from '../services/errors';
import { withTimeout } from '../lib/timeout';
import { loadDemoActions } from '../demo/store';
import type { CleanupAction } from '../types';
import type { DataPhase } from './useReports';

export function useActions() {
  const [actions, setActions] = useState<CleanupAction[]>(() =>
    isFirebaseConfigured ? [] : loadDemoActions(),
  );
  const [phase, setPhase] = useState<DataPhase>(isFirebaseConfigured ? 'loading' : 'ready');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setActions(loadDemoActions());
      setPhase('ready');
      setError(null);
      return;
    }

    setPhase('loading');
    setError(null);
    try {
      const result = await withTimeout(fetchActions());
      setActions(result);
      setPhase('ready');
    } catch (err) {
      setError(toSerbianError(err, 'Akcije trenutno nisu dostupne.'));
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { actions, phase, error, load };
}
