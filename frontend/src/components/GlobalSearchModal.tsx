import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { Search, X, BookOpen, Layers, CheckSquare, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';

interface SearchResultItem {
  id: string;
  type: 'Course' | 'Session' | 'Task' | 'User';
  title: string;
  subtitle?: string;
  link: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/courses/student`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (res.ok) {
          const courses = await res.json();
          const q = query.toLowerCase();
          const matched: SearchResultItem[] = [];

          courses.forEach((c: any) => {
            if (c.name.toLowerCase().includes(q) || c.courseCode.toLowerCase().includes(q)) {
              matched.push({
                id: c.id,
                type: 'Course',
                title: c.name,
                subtitle: `Code: ${c.courseCode}`,
                link: `/courses/${c.id}`,
              });
            }

            if (c.sessions) {
              c.sessions.forEach((s: any) => {
                if (s.title.toLowerCase().includes(q)) {
                  matched.push({
                    id: s.id,
                    type: 'Session',
                    title: s.title,
                    subtitle: `Course: ${c.name}`,
                    link: `/courses/${c.id}`,
                  });
                }
                if (s.tasks) {
                  s.tasks.forEach((t: any) => {
                    if (t.title.toLowerCase().includes(q)) {
                      matched.push({
                        id: t.id,
                        type: 'Task',
                        title: t.title,
                        subtitle: `Session: ${s.title}`,
                        link: `/tasks/${t.id}`,
                      });
                    }
                  });
                }
              });
            }
          });

          setResults(matched);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-[#121215] border border-[#2B2B36] rounded-2xl max-w-xl w-full p-4 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 bg-[#1A1A20] border border-[#2B2B36] rounded-xl px-4 py-3">
          <Search className="w-5 h-5 text-violet-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search courses, sessions, programming tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          {searching ? (
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] uppercase font-bold text-zinc-500 bg-[#252530] px-2 py-0.5 rounded">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {query.trim() && !searching && results.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-8">No results found matching "{query}".</p>
          )}

          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                navigate(item.link);
                onClose();
              }}
              className="p-3 bg-[#17171C] hover:bg-[#1E1E26] border border-[#22222A] rounded-xl flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  {item.type === 'Course' && <BookOpen className="w-4 h-4" />}
                  {item.type === 'Session' && <Layers className="w-4 h-4" />}
                  {item.type === 'Task' && <CheckSquare className="w-4 h-4" />}
                  {item.type === 'User' && <GraduationCap className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                    {item.title}
                  </h4>
                  {item.subtitle && <p className="text-[10px] text-zinc-400">{item.subtitle}</p>}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
