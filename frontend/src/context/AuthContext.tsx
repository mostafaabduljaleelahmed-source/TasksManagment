import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Teacher' | 'Student';
  studentId?: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: string, studentId?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = 'http://localhost:5115/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('grading_platform_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('grading_platform_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
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
        token: data.token,
      };

      setUser(userData);
      localStorage.setItem('grading_platform_user', JSON.stringify(userData));
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
        return { success: false, error: data.message || 'Registration failed' };
      }

      const userData: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        studentId: data.studentId,
        token: data.token,
      };

      setUser(userData);
      localStorage.setItem('grading_platform_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Cannot connect to the server' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('grading_platform_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
