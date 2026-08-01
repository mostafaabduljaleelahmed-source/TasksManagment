import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showBackButton = false,
  className = '',
}) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  // Mobile view: Show only the current (last) item or simple back context
  const lastItem = items[items.length - 1];

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 py-1 ${className}`}>
      {/* Mobile Breadcrumb (Simplified single level) */}
      <div className="flex sm:hidden items-center gap-1.5 text-xs text-zinc-400 min-w-0 truncate">
        <Home className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
        <span className="text-zinc-200 font-bold tracking-tight truncate">
          {lastItem?.label}
        </span>
      </div>

      {/* Desktop / Tablet Breadcrumb Chain */}
      <nav aria-label="Breadcrumb" className="hidden sm:flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
        <Link
          to="/dashboard"
          className="hover:text-white flex items-center gap-1.5 transition-colors p-1 rounded-md hover:bg-zinc-800/40"
        >
          <Home className="w-3.5 h-3.5 text-violet-400" />
          <span>Dashboard</span>
        </Link>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              {isLast || !item.href ? (
                <span className="text-zinc-200 font-bold tracking-tight px-1 truncate max-w-[250px] sm:max-w-none">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-800/40 truncate max-w-[180px] sm:max-w-none"
                >
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {showBackButton && (
        <button
          onClick={() => navigate(-1)}
          className="hidden sm:flex px-3 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-zinc-200 font-semibold text-xs rounded-xl border border-[#374151] transition-all items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
          <span>Back</span>
        </button>
      )}
    </div>
  );
};
