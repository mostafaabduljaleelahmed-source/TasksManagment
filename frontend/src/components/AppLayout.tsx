import React from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-[#F9FAFB]">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
