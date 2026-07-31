import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-[#F9FAFB]">
      <Sidebar isOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

