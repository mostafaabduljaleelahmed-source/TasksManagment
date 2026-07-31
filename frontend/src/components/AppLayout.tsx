import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebarCollapsed', String(next));
      } catch {
        // Fallback if localStorage is disabled
      }
      return next;
    });
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-[#F9FAFB]">
      <Sidebar
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-250 ease-in-out">
        <Navbar onOpenMobileDrawer={() => setIsMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
};


