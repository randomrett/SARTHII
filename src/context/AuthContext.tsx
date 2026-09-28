import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { apiLogin, apiRegister, apiFetchUsers, apiUpdateUserRole } from '../utils/api';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isLoading: boolean;
  allUsers: User[];
  login: (email: string, password: string) => Promise<void>;
  loginAsDemoRole: (role: UserRole) => Promise<void>;
  register: (email: string, password: string, fullName?: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_ACCOUNTS: Record<UserRole, { email: string; pass: string }> = {
  admin: { email: 'admin@saarthi.ai', pass: 'password123' },
  manager: { email: 'manager@saarthi.ai', pass: 'password123' },
  field_worker: { email: 'worker@saarthi.ai', pass: 'password123' }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('saarthi_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('saarthi_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const saveAuthSession = (user: User, authToken: string) => {
    setCurrentUser(user);
    setToken(authToken);
    localStorage.setItem('saarthi_user', JSON.stringify(user));
    localStorage.setItem('saarthi_token', authToken);
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('saarthi_user');
    localStorage.removeItem('saarthi_token');
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password);
      saveAuthSession(res.user, res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const creds = DEMO_ACCOUNTS[role];
      try {
        const res = await apiLogin(creds.email, creds.pass);
        saveAuthSession(res.user, res.access_token);
      } catch {
        // If login failed (e.g. user not created yet), register then login
        const registered = await apiRegister(creds.email, creds.pass, `${role.toUpperCase()} User`, role);
        const res = await apiLogin(creds.email, creds.pass);
        saveAuthSession(res.user || registered, res.access_token);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName?: string, role?: UserRole) => {
    setIsLoading(true);
    try {
      await apiRegister(email, password, fullName, role);
      const res = await apiLogin(email, password);
      saveAuthSession(res.user, res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUsers = async () => {
    if (currentUser?.role === 'admin') {
      try {
        const users = await apiFetchUsers();
        setAllUsers(users);
      } catch (err) {
        console.warn('[AUTH] Could not fetch system users:', err);
      }
    }
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    const updated = await apiUpdateUserRole(userId, role);
    setAllUsers(prev => prev.map(u => u.id === userId ? updated : u));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(updated);
      localStorage.setItem('saarthi_user', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      refreshUsers();
    }
  }, [currentUser?.role]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      token,
      isLoading,
      allUsers,
      login,
      loginAsDemoRole,
      register,
      logout,
      updateUserRole,
      refreshUsers
    }}>
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
