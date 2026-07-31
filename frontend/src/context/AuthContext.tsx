import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Teacher' | 'Student';
  studentId?: string;
  avatarUrl?: string | null;
  isEmailVerified?: boolean;
  token: string;
  refreshToken?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (idToken: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  createTeacher: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyEmail: (email: string, token: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  updateUserAvatar: (avatarUrl: string | null) => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = '/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
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

  const saveUserData = (userData: User, rememberMe: boolean = true) => {
    setUser(userData);
    sessionStorage.setItem('grading_platform_user', JSON.stringify(userData));
    if (rememberMe) {
      localStorage.setItem('grading_platform_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('grading_platform_user');
    }
  };

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
        isEmailVerified: data.isEmailVerified,
        token: data.token,
        refreshToken: data.refreshToken,
      };

      saveUserData(userData, rememberMe);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Cannot connect to the server' };
    }
  };

  const googleLogin = async (idToken: string, role: string = 'Student') => {
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Google login failed' };
      }

      const userData: User = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        studentId: data.studentId,
        avatarUrl: data.avatarUrl,
        isEmailVerified: true,
        token: data.token,
        refreshToken: data.refreshToken,
      };

      saveUserData(userData, true);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Cannot connect to the server for Google login' };
    }
  };

  const register = async (name: string, email: string, password: string, role: string = 'Student') => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || data.detail || data.error || 'Registration failed' };
      }

      return { success: true, message: data.message || 'Registration successful! Please check your email inbox to verify your account.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Cannot connect to the server' };
    }
  };

  const verifyEmail = async (email: string, token: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Email verification failed' };
      }

      return { success: true, message: data.message || 'Email verified successfully!' };
    } catch (err: any) {
      return { success: false, error: 'Failed to verify email' };
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to resend verification email' };
      }

      return { success: true, message: data.message || 'A new verification link has been dispatched to your email.' };
    } catch (err: any) {
      return { success: false, error: 'Network error resending verification email' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to request password reset' };
      }

      return { success: true, message: data.message || 'If registered, a password reset link has been dispatched to your email.' };
    } catch (err: any) {
      return { success: false, error: 'Network error sending password reset link' };
    }
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to reset password' };
      }

      return { success: true, message: data.message || 'Password reset successfully!' };
    } catch (err: any) {
      return { success: false, error: 'Network error resetting password' };
    }
  };

  const createTeacher = async (name: string, email: string, password: string) => {
    try {
      const token = user?.token;
      const response = await fetch(`${API_URL}/auth/create-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to create teacher account' };
      }

      return { success: true, message: data.message || 'Teacher account created successfully.' };
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleLogin,
        register,
        createTeacher,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        logout,
        updateUserAvatar,
        updateUser
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
