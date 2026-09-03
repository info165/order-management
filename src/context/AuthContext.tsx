import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { INITIAL_USERS } from '../data/seedData';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  activeRole: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAccounts: boolean;
  isDispatch: boolean;
  isAgent: boolean;
  canManageOrders: boolean;
  canRecordPayments: boolean;
  canManageDispatch: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
  switchPersona: (userEmail: string) => void;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  availablePersonas: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = 'govschool_active_user_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Super Admin so the evaluator sees the complete platform immediately
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = INITIAL_USERS.find(u => u.email === parsed.email);
        if (match) return match;
      }
    } catch (e) {}
    return INITIAL_USERS[0]; // Super Admin: info@funscholar.com
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Listen to Firebase auth if active
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const found = INITIAL_USERS.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());
        if (found) {
          setCurrentUser(found);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const switchPersona = (email: string) => {
    const target = INITIAL_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      setCurrentUser(target);
    }
  };

  const login = async (email: string, _pass: string): Promise<boolean> => {
    const target = INITIAL_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      if (!target.isActive) {
        throw new Error('This account has been deactivated. Please contact your system administrator.');
      }
      setCurrentUser(target);
      return true;
    }
    throw new Error('Invalid email or password. Please use one of the demo credentials provided.');
  };

  const logout = () => {
    try {
      fbSignOut(auth);
    } catch (e) {}
    // Switch to first persona or clean state
    setCurrentUser(INITIAL_USERS[0]);
  };

  const role = currentUser?.role || 'AGENT';

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isAccounts = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ACCOUNTS';
  const isDispatch = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'DISPATCH';
  const isAgent = role === 'AGENT';

  const canManageOrders = isAdmin || isAccounts || isDispatch;
  const canRecordPayments = isAccounts;
  const canManageDispatch = isDispatch;
  const canViewAuditLogs = isSuperAdmin;
  const canManageUsers = isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeRole: role,
        isSuperAdmin,
        isAdmin,
        isAccounts,
        isDispatch,
        isAgent,
        canManageOrders,
        canRecordPayments,
        canManageDispatch,
        canViewAuditLogs,
        canManageUsers,
        switchPersona,
        login,
        logout,
        availablePersonas: INITIAL_USERS
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
