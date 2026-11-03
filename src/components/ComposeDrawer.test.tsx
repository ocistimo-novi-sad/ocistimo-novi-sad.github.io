import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppContext, type AppContextValue } from '../state/app-context';
import { ComposeDrawer } from './ComposeDrawer';

// The form words its notes differently with and without Firebase, so each
// test picks the mode instead of reading it from the VITE_FIREBASE_* variables.
const firebase = vi.hoisted(() => ({ configured: false }));

vi.mock('../services/firebase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/firebase')>()),
  get isFirebaseConfigured() {
    return firebase.configured;
  },
}));

// jsdom has no matchMedia, which the drawer uses to tell phones from desktops.
vi.stubGlobal('matchMedia', (media: string) => ({
  matches: false,
  media,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
}));

afterEach(cleanup);

/** A signed-out visitor opens an empty "new report" form. */
function renderNewReportForm() {
  const app: Partial<AppContextValue> = {
    auth: {
      user: null,
      role: 'user',
      isAdmin: false,
      isModerator: false,
      ready: true,
      signingIn: false,
      signInError: null,
      signIn: async () => {},
      signOut: async () => {},
      configured: firebase.configured,
    },
    composeLocation: null,
    composeEditing: null,
    setComposeLocation: () => {},
    cancelCompose: () => {},
    addCreatedReport: () => {},
    storeCreatedReport: () => {},
    submitReportEdit: async () => {},
    flyTo: () => {},
    notify: () => {},
    userPosition: null,
    mapRef: { current: null },
  };
  return render(
    <AppContext.Provider value={app as AppContextValue}>
      <ComposeDrawer />
    </AppContext.Provider>,
  );
}

describe.each([
  { mode: 'with Firebase', configured: true },
  { mode: 'in demo mode', configured: false },
])('ComposeDrawer $mode', ({ configured }) => {
  beforeEach(() => {
    firebase.configured = configured;
  });

  // Issue #26: the app speaks to everyone, not only members of a zbor.
  it('never calls the community "Zbor"', () => {
    const { container } = renderNewReportForm();
    const words = container.textContent?.match(/\p{L}+/gu) ?? [];
    expect(words.filter((word) => /^zbor/i.test(word))).toEqual([]);
  });

  it('labels the note before sending "Napomena"', () => {
    renderNewReportForm();
    expect(screen.queryByText('Napomena')).not.toBeNull();
    expect(screen.queryByText('Pre objave')).toBeNull();
  });
});
