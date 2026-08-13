import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import {
  Search, Users, BookOpen, FolderGit2, FileCode, X, Command, Loader2
} from 'lucide-react';

interface StudentResult {
  id: string;
  name: string;
  registerId: string;
  avatarUrl?: string | null;
  email: string;
}

interface CourseResult {
  id: string;
  name: string;
  courseCode: string;
  description: string;
}

interface SessionResult {
  id: string;
  title: string;
  order: number;
  courseId: string;
  courseName: string;
}

interface AssignmentResult {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  sessionName: string;
  deadline: string;
  maxGrade: number;
}

interface SearchResults {
  students: StudentResult[];
  courses: CourseResult[];
  sessions: SessionResult[];
  assignments: AssignmentResult[];
}

export const GlobalSearch: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Search API call
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/dashboard/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleSelect = (type: 'student' | 'course' | 'session' | 'assignment', item: any) => {
    setIsOpen(false);
    setQuery('');

    if (type === 'course') {
      navigate(`/course/${item.id}`);
    } else if (type === 'session') {
      navigate(`/course/${item.courseId}`);
    } else if (type === 'assignment') {
      if (user?.role === 'Teacher') {
        navigate('/teacher/pending-reviews');
      } else {
        navigate(`/task/${item.id}`);
      }
    } else if (type === 'student') {
      navigate('/teacher/students');
    }
  };

  const hasResults = results && (
    results.students.length > 0 ||
    results.courses.length > 0 ||
    results.sessions.length > 0 ||
    results.assignments.length > 0
  );

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search students, courses, sessions, assignments..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full bg-[#1F1F24] border border-[#2F2F37] focus:border-violet-500 text-white rounded-xl pl-10 pr-16 py-2 text-xs font-medium focus:outline-none transition-all placeholder:text-zinc-500 shadow-inner"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-mono text-zinc-500 bg-[#16161A] border border-[#2F2F37] px-1.5 py-0.5 rounded">
            <Command className="w-2.5 h-2.5" />K
          </span>
        )}
      </div>

      {/* Results Dropdown Overlay */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#16161A] border border-[#2F2F37] rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[75vh] overflow-y-auto divide-y divide-[#2F2F37]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              Searching platform...
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No matching students, courses, sessions, or assignments found for "{query}".
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {/* Category 1: Students */}
              {results.students.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-3 py-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" /> Students ({results.students.length})
                  </span>
                  <div className="space-y-0.5">
                    {results.students.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleSelect('student', st)}
                        className="px-3 py-2 hover:bg-[#1F1F28] rounded-xl cursor-pointer transition-colors flex items-center justify-between group text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center border border-blue-400/30 overflow-hidden shrink-0">
                            {st.avatarUrl ? (
                              <img src={st.avatarUrl} alt={st.name} className="w-full h-full object-cover" />
                            ) : (
                              st.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-blue-300 transition-colors">
                              <HighlightText text={st.name} query={query} />
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              ID: <HighlightText text={st.registerId} query={query} />
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">View Roster &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Courses */}
              {results.courses.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-3 py-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-violet-400" /> Courses ({results.courses.length})
                  </span>
                  <div className="space-y-0.5">
                    {results.courses.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelect('course', c)}
                        className="px-3 py-2 hover:bg-[#1F1F28] rounded-xl cursor-pointer transition-colors flex items-center justify-between group text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                              <HighlightText text={c.courseCode} query={query} />
                            </span>
                            <span className="font-bold text-white group-hover:text-violet-300 transition-colors">
                              <HighlightText text={c.name} query={query} />
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Open &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Sessions */}
              {results.sessions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-3 py-1 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" /> Sessions ({results.sessions.length})
                  </span>
                  <div className="space-y-0.5">
                    {results.sessions.map((sess) => (
                      <div
                        key={sess.id}
                        onClick={() => handleSelect('session', sess)}
                        className="px-3 py-2 hover:bg-[#1F1F28] rounded-xl cursor-pointer transition-colors flex items-center justify-between group text-xs"
                      >
                        <div>
                          <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                            <HighlightText text={sess.title} query={query} />
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Course: <HighlightText text={sess.courseName} query={query} />
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Go to Course &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 4: Assignments */}
              {results.assignments.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-3 py-1 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-amber-400" /> Assignments ({results.assignments.length})
                  </span>
                  <div className="space-y-0.5">
                    {results.assignments.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleSelect('assignment', task)}
                        className="px-3 py-2 hover:bg-[#1F1F28] rounded-xl cursor-pointer transition-colors flex items-center justify-between group text-xs"
                      >
                        <div>
                          <p className="font-bold text-white group-hover:text-amber-300 transition-colors">
                            <HighlightText text={task.title} query={query} />
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            <HighlightText text={task.courseName} query={query} /> • {task.sessionName}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 group-hover:translate-x-0.5 transition-transform">
                          {user?.role === 'Teacher' ? 'Manage' : 'Solve'} &rarr;
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Substring Search Match Highlighting Component
const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-500/25 text-amber-300 font-extrabold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};
