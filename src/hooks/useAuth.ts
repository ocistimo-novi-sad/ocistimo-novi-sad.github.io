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
import {
  ensureProfile,
  savePublicName as savePublicNameRecord,
  setActivePublicName,
  type ProfileIdentity,
} from '../services/profile';
import { fetchRole } from '../services/roles';
import { AppError, errorCode, toSerbianError } from '../services/errors';
import type { UserRole } from '../types';

function identityOf(user: User): ProfileIdentity {
  return {
    displayName: user.displayName ?? 'Član zajednice',
    email: user.email,
    photoURL: user.photoURL,
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('user');
  const [ready, setReady] = useState(!isFirebaseConfigured);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  // Null until the person chooses one, or when the profile could not be read.
  const [publicName, setPublicName] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(!isFirebaseConfigured);

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
          setRole('user');
          setPublicName(null);
          setActivePublicName(null);
          setProfileReady(true);
          return;
        }

        const stillCurrent = () =>
          !cancelled && auth?.currentUser?.uid === nextUser.uid;

        setProfileReady(false);
        void fetchRole(nextUser.uid).then((nextRole) => {
          if (stillCurrent()) setRole(nextRole);
        });
        void ensureProfile(nextUser.uid, identityOf(nextUser)).then((profile) => {
          // A slow reply for user A must not overwrite user B after a switch.
          if (!stillCurrent()) return;
          const name = profile?.publicName ?? null;
          setPublicName(name);
          setActivePublicName(name);
          // A failed profile read must not look like a missing public name.
          setProfileReady(profile !== null);
        });
      },
      (error) => {
        if (cancelled) return;
        setReady(true);
        setSignInError(toSerbianError(error, 'Logovanje nije uspelo.'));
      },
    );

    void getRedirectResult(auth).catch((error: unknown) => {
      if (cancelled) return;
      setSignInError(toSerbianError(error, 'Logovanje nije uspelo.'));
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
          setSignInError(toSerbianError(redirectError, 'Logovanje nije uspelo.'));
          throw redirectError;
        }
      } else {
        setSignInError(toSerbianError(error, 'Logovanje nije uspelo.'));
        throw error;
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  /**
   * Reads the profile again, for example when the read at sign-in failed.
   * Returns the public name (null if none is chosen yet), or undefined if the
   * profile still cannot be read.
   */
  const reloadProfile = useCallback(async (): Promise<string | null | undefined> => {
    const current = auth?.currentUser;
    if (!current) return undefined;
    const profile = await ensureProfile(current.uid, identityOf(current));
    if (!profile || auth?.currentUser?.uid !== current.uid) return undefined;
    setPublicName(profile.publicName);
    setActivePublicName(profile.publicName);
    setProfileReady(true);
    return profile.publicName;
  }, []);

  /** Saves the public author name and returns the stored value. */
  const updatePublicName = useCallback(
    async (value: string): Promise<string> => {
      if (!user) throw new AppError('unauthenticated', 'Uloguj se ponovo.');
      const name = await savePublicNameRecord(user.uid, value, identityOf(user));
      setPublicName(name);
      setActivePublicName(name);
      // A saved name also proves the profile exists now.
      setProfileReady(true);
      return name;
    },
    [user],
  );

  const signOutUser = useCallback(async (): Promise<void> => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  return {
    user,
    role,
    isAdmin: role === 'admin',
    /** Admins hold every moderator right as well. */
    isModerator: role !== 'user',
    ready,
    publicName,
    profileReady,
    reloadProfile,
    updatePublicName,
    signingIn,
    signInError,
    signIn,
    signOut: signOutUser,
    configured: isFirebaseConfigured,
  };
}
