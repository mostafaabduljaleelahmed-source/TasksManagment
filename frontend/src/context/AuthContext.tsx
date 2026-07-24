import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Teacher' | 'Student';
  studentId?: string;
  avatarUrl?: string | null;
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: string, studentId?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserAvatar: (avatarUrl: string | null) => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = 'http://localhost:5115/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Tab-Isolated Session Management: Check sessionStorage first to isolate tabs during dev/testing, then fallback to localStorage
    const sessionSaved = sessionStorage.getItem('grading_platform_user');
    const localSaved = localStorage.getItem('grading_platform_user');
    
    if (sessionSaved) {
      try {
        setUser(JSON.parse(sessionSaved));
      } catch (e) {
        sessionStorage.removeItem('grading_platform_user');
      }
    } else if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        setUser(parsed);
        sessionStorage.setItem('grading_platform_user', localSaved);
      } catch (e) {
        localStorage.removeItem('grading_platform_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      const userData: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        studentId: data.studentId,
        avatarUrl: data.avatarUrl,
        token: data.token,
      };

      setUser(userData);
      sessionStorage.setItem('grading_platform_user', JSON.stringify(userData));
      if (rememberMe) {
        localStorage.setItem('grading_platform_user', JSON.stringify(userData));
      } else {
        localStorage.removeItem('grading_platform_user');
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Cannot connect to the server' };
    }
  };

  const register = async (name: string, email: string, password: string, role: string, studentId?: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, studentId }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || data.detail || data.error || 'Registration failed' };
      }

      const userData: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        studentId: data.studentId,
        avatarUrl: data.avatarUrl,
        token: data.token,
      };

      setUser(userData);
      sessionStorage.setItem('grading_platform_user', JSON.stringify(userData));
      localStorage.setItem('grading_platform_user', JSON.stringify(userData));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Cannot connect to the server' };
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updatedFields };
    setUser(updated);
    sessionStorage.setItem('grading_platform_user', JSON.stringify(updated));
    if (localStorage.getItem('grading_platform_user')) {
      localStorage.setItem('grading_platform_user', JSON.stringify(updated));
    }
  };

  const updateUserAvatar = (avatarUrl: string | null) => {
    updateUser({ avatarUrl });
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('grading_platform_user');
    localStorage.removeItem('grading_platform_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserAvatar, updateUser }}>
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
