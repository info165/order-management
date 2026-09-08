import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_USERS } from '../data/seedData';
import { getUsers } from '../services/dataService';
import { auth, googleProvider, createAuthAccountForUser } from '../firebase/config';
import { onAuthStateChanged, signOut as fbSignOut, signInWithPopup, signInWithEmailAndPassword, User as FbUser } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FbUser | null;
  activeRole: UserRole | 'GUEST';
  isLoggedIn: boolean;
  authLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isDataEntry: boolean;
  isAccounts: boolean;
  isDispatch: boolean;
  isAgent: boolean;
  canManageOrders: boolean;
  canRecordPayments: boolean;
  canManageDispatch: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
  switchPersona: (userEmail: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  login: (identifier: string, pass: string) => Promise<boolean>;
  logout: () => void;
  availablePersonas: UserProfile[];
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = 'govschool_auth_session_v3';

// Clean up any stale legacy session keys
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('govschool_active_user_v2');
  }
} catch (_) {}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FbUser | null>(auth.currentUser);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [authLoading, setAuthLoading] = useState(true);

  // Lazy-initialize from localStorage so session is immediately available on page refresh
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(USER_SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.userId || parsed.email)) {
            return parsed;
          }
        }
      }
    } catch (_) {}
    return null;
  });

  const refreshUsers = async () => {
    try {
      const list = await getUsers();
      setAllUsers(list);
      // If current user is logged in, refresh their profile
      if (currentUser) {
        const updatedSelf = list.find(u =>
          (currentUser.userId && u.userId === currentUser.userId) ||
          (currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
        );
        if (updatedSelf && updatedSelf.isActive) {
          setCurrentUser(updatedSelf);
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedSelf));
        }
      }
    } catch (e) {
      console.error('Failed to refresh user list:', e);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  // Sync currentUser changes to localStorage ONLY after initial auth evaluation completes
  useEffect(() => {
    if (authLoading) return;
    if (currentUser) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  }, [currentUser, authLoading]);

  // Listen to Firebase auth state and restore session before deciding whether to show app
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        const email = fbUser.email.toLowerCase();
        try {
          const list = await getUsers();
          if (isMounted) setAllUsers(list);
          const found = list.find(u => u.email.toLowerCase() === email);
          if (found) {
            if (isMounted) {
              setCurrentUser(found);
              localStorage.setItem(USER_SESSION_KEY, JSON.stringify(found));
            }
          } else {
            const newFbProfile: UserProfile = {
              userId: fbUser.uid,
              name: fbUser.displayName || email.split('@')[0] || 'Authorized Staff',
              email: fbUser.email,
              role: email === 'info@funscholar.com' ? 'SUPER_ADMIN' : 'ADMIN',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            if (isMounted) {
              setCurrentUser(newFbProfile);
              localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newFbProfile));
            }
          }
        } catch (e) {
          console.error('Error resolving user during Firebase auth resolution:', e);
          if (isMounted) {
            setCurrentUser(prev => {
              if (prev && prev.email.toLowerCase() === email) return prev;
              const fallback: UserProfile = {
                userId: fbUser.uid,
                name: fbUser.displayName || email.split('@')[0] || 'Authorized Staff',
                email: fbUser.email,
                role: email === 'info@funscholar.com' ? 'SUPER_ADMIN' : 'ADMIN',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              localStorage.setItem(USER_SESSION_KEY, JSON.stringify(fallback));
              return fallback;
            });
          }
        }
      } else {
        // Firebase has no active Google user; check if an authenticated session exists from username/password login
        try {
          const saved = typeof window !== 'undefined' ? localStorage.getItem(USER_SESSION_KEY) : null;
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.userId || parsed.email)) {
              try {
                const list = await getUsers();
                if (isMounted) setAllUsers(list);
                const found = list.find(u =>
                  (parsed.userId && u.userId === parsed.userId) ||
                  (parsed.email && u.email.toLowerCase() === parsed.email.toLowerCase())
                );
                if (found) {
                  if (found.isActive) {
                    if (isMounted) {
                      setCurrentUser(found);
                      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(found));
                    }
                  } else {
                    // Deactivated account
                    if (isMounted) {
                      setCurrentUser(null);
                      localStorage.removeItem(USER_SESSION_KEY);
                    }
                  }
                } else {
                  // Fallback: retain the parsed user
                  if (isMounted) {
                    setCurrentUser(parsed);
                  }
                }
              } catch (fetchErr) {
                // If network failed, keep the cached session alive
                if (isMounted) {
                  setCurrentUser(parsed);
                }
              }
            } else {
              if (isMounted) {
                setCurrentUser(null);
                localStorage.removeItem(USER_SESSION_KEY);
              }
            }
          } else {
            if (isMounted) {
              setCurrentUser(null);
            }
          }
        } catch (e) {
          if (isMounted) setCurrentUser(null);
        }
      }
      if (isMounted) {
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        const email = result.user.email.toLowerCase();
        const list = await getUsers();
        setAllUsers(list);
        const found = list.find(u => u.email.toLowerCase() === email);
        if (found) {
          setCurrentUser(found);
        } else {
          const newFbProfile: UserProfile = {
            userId: result.user.uid,
            name: result.user.displayName || email.split('@')[0],
            email: result.user.email,
            role: email === 'info@funscholar.com' ? 'SUPER_ADMIN' : 'ADMIN',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setCurrentUser(newFbProfile);
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google Sign-In popup was closed before completion.');
      } else if (err.code === 'auth/popup-blocked') {
        throw new Error('Popup blocked by browser. Please enable popups or sign in with your email credentials.');
      }
      throw new Error(err.message || 'Google OAuth authentication failed. Please try again.');
    }
  };

  const switchPersona = async (email: string) => {
    const list = await getUsers();
    const target = list.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      setCurrentUser(target);
      try {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(target));
      } catch (_) {}
    }
  };

  const login = async (identifier: string, pass: string): Promise<boolean> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();
    const looksLikeEmail = cleanId.includes('@');

    // Finalize a successful sign-in: fetch the profile (now permitted, since
    // we're authenticated) and set it as the current user.
    const finalizeLogin = async (email: string): Promise<boolean> => {
      const list = await getUsers();
      setAllUsers(list);
      const found = list.find(u => u.email.toLowerCase() === email);
      if (!found) {
        await fbSignOut(auth);
        throw new Error('Signed in, but no matching profile record was found. Please contact the Super Admin.');
      }
      if (!found.isActive) {
        await fbSignOut(auth);
        throw new Error('This account is currently deactivated. Please contact Super Admin (info@funscholar.com) to reactivate your credentials.');
      }
      const updatedUser = { ...found, lastLoginAt: new Date().toISOString() };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
      } catch (_) {}
      return true;
    };

    // Try REAL Firebase sign-in FIRST when the identifier is an email. This is a
    // direct Firebase Auth call - it needs no prior Firestore read, so it works
    // from a completely fresh session (a different device, incognito, cleared
    // storage) even though that session can't yet read the users collection
    // (Firestore's rules correctly require being signed in first to read it -
    // which is exactly the chicken-and-egg this avoids).
    if (looksLikeEmail) {
      try {
        await signInWithEmailAndPassword(auth, cleanId, cleanPass);
        return await finalizeLogin(cleanId);
      } catch (err: any) {
        const code = err?.code;
        const looksUnmigrated =
          code === 'auth/invalid-credential' ||
          code === 'auth/user-not-found' ||
          code === 'auth/wrong-password';
        if (!looksUnmigrated) {
          // A real error (e.g. our own "deactivated"/"no profile" throw above,
          // or a genuine network issue) - surface it directly.
          throw err instanceof Error ? err : new Error(err?.message || 'Sign-in failed. Please try again.');
        }
        // Otherwise fall through to the legacy path below: either this account
        // predates real Firebase accounts and needs lazy migration, or the
        // password is wrong - both require reading the stored record, which
        // only succeeds here if the caller already has an authenticated
        // session with access (e.g. testing from the Super Admin's browser).
      }
    }

    const list = await getUsers();
    setAllUsers(list);

    const target = list.find(u =>
      u.email.toLowerCase() === cleanId ||
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.agentCode && u.agentCode.toLowerCase() === cleanId)
    );

    if (!target) {
      throw new Error('No user account found matching these credentials. Login credentials must be issued by the Super Admin.');
    }

    if (!target.isActive) {
      throw new Error('This account is currently deactivated. Please contact Super Admin (info@funscholar.com) to reactivate your credentials.');
    }

    const storedPasswordMatches = !!target.password && target.password === cleanPass;
    if (!storedPasswordMatches) {
      throw new Error('Incorrect password. Please verify the credentials issued by the Super Admin.');
    }

    // This account was issued before real Firebase accounts existed for
    // username/password logins (or never completed that migration). Since we
    // already verified the password against the Super-Admin-issued record
    // above, it's safe to create the real Firebase account now and sign in.
    try {
      await createAuthAccountForUser(target.email, cleanPass);
      await signInWithEmailAndPassword(auth, target.email, cleanPass);
    } catch (migrateErr: any) {
      if (migrateErr?.code === 'auth/email-already-in-use') {
        throw new Error(
          'This password no longer matches our secure login system. Please ask the Super Admin to reset your password, then check your email for a reset link.'
        );
      }
      throw new Error(migrateErr?.message || 'Could not establish a secure session. Please try again.');
    }

    const updatedUser = {
      ...target,
      lastLoginAt: new Date().toISOString()
    };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
    } catch (_) {}
    return true;
  };

  const logout = () => {
    try {
      fbSignOut(auth);
    } catch (e) {}
    setFirebaseUser(null);
    setCurrentUser(null);
    localStorage.removeItem(USER_SESSION_KEY);
  };

  const role = currentUser?.role || 'GUEST';

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isDataEntry = role === 'DATA_ENTRY_OPERATOR';
  const isAccounts = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ACCOUNTS';
  const isDispatch = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'DISPATCH';
  const isAgent = role === 'AGENT';

  const canManageOrders = isAdmin || isAccounts || isDispatch || isDataEntry;
  const canRecordPayments = isAccounts;
  const canManageDispatch = isDispatch;
  const canViewAuditLogs = isSuperAdmin;
  const canManageUsers = isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        activeRole: role as UserRole,
        isLoggedIn: currentUser !== null,
        authLoading,
        isSuperAdmin,
        isAdmin,
        isDataEntry,
        isAccounts,
        isDispatch,
        isAgent,
        canManageOrders,
        canRecordPayments,
        canManageDispatch,
        canViewAuditLogs,
        canManageUsers,
        switchPersona,
        signInWithGoogle,
        login,
        logout,
        availablePersonas: allUsers,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
