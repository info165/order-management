import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_USERS } from '../data/seedData';
import { getUsers } from '../services/dataService';
import { auth, googleProvider } from '../firebase/config';
import { onAuthStateChanged, signOut as fbSignOut, signInWithPopup, User as FbUser } from 'firebase/auth';

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

  // Default to null for unauthenticated state - NEVER default to Super Admin
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const refreshUsers = async () => {
    try {
      const list = await getUsers();
      setAllUsers(list);
      // If current user is logged in, refresh their profile
      if (currentUser) {
        const updatedSelf = list.find(u => u.userId === currentUser.userId || u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (updatedSelf) {
          setCurrentUser(updatedSelf);
        }
      }
    } catch (e) {
      console.error('Failed to refresh user list:', e);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  }, [currentUser]);

  // Listen to Firebase auth state and restore session before deciding whether to show app
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        const email = fbUser.email.toLowerCase();
        try {
          const list = await getUsers();
          setAllUsers(list);
          const found = list.find(u => u.email.toLowerCase() === email);
          if (found) {
            setCurrentUser(found);
          } else {
            const newFbProfile: UserProfile = {
              userId: fbUser.uid,
              name: fbUser.displayName || 'Authorized Staff',
              email: fbUser.email,
              role: email === 'info@funscholar.com' ? 'SUPER_ADMIN' : 'ADMIN',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setCurrentUser(newFbProfile);
          }
        } catch (e) {
          console.error('Error fetching user during Firebase auth resolution:', e);
        }
      } else {
        // Firebase has no active session; check if an authenticated session exists from username/password login
        try {
          const saved = localStorage.getItem(USER_SESSION_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.email && parsed.userId) {
              const list = await getUsers();
              setAllUsers(list);
              const found = list.find(u => u.userId === parsed.userId || u.email.toLowerCase() === parsed.email.toLowerCase());
              if (found && found.isActive) {
                setCurrentUser(found);
              } else {
                setCurrentUser(null);
                localStorage.removeItem(USER_SESSION_KEY);
              }
            } else {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        } catch (e) {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
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
    }
  };

  const login = async (identifier: string, pass: string): Promise<boolean> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

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

    // Check password if set on user, otherwise check demo defaults
    if (target.password && target.password !== cleanPass) {
      throw new Error('Incorrect password. Please verify the credentials issued by the Super Admin.');
    }

    const updatedUser = {
      ...target,
      lastLoginAt: new Date().toISOString()
    };
    setCurrentUser(updatedUser);
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
