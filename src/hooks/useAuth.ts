import { useCallback, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { checkIsAdmin, ensureProfile } from '../services/profile';
import { errorCode, toSerbianError } from '../services/errors';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(!isFirebaseConfigured);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        if (cancelled) return;
        setUser(nextUser);
        setReady(true);

        if (!nextUser) {
          setIsAdmin(false);
          return;
        }

        void checkIsAdmin(nextUser.uid).then((admin) => {
          if (!cancelled) setIsAdmin(admin);
        });
        void ensureProfile(
          nextUser.uid,
          nextUser.displayName ?? 'Član zajednice',
          nextUser.photoURL,
        );
      },
      (error) => {
        if (cancelled) return;
        setReady(true);
        setSignInError(toSerbianError(error, 'Prijava nije uspela.'));
      },
    );

    void getRedirectResult(auth).catch((error: unknown) => {
      if (cancelled) return;
      setSignInError(toSerbianError(error, 'Prijava nije uspela.'));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (): Promise<void> => {
    if (!auth) return;
    setSigningIn(true);
    setSignInError(null);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = errorCode(error);
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          setSignInError(toSerbianError(redirectError, 'Prijava nije uspela.'));
          throw redirectError;
        }
      } else {
        setSignInError(toSerbianError(error, 'Prijava nije uspela.'));
        throw error;
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async (): Promise<void> => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  return {
    user,
    isAdmin,
    ready,
    signingIn,
    signInError,
    signIn,
    signOut: signOutUser,
    configured: isFirebaseConfigured,
  };
}
