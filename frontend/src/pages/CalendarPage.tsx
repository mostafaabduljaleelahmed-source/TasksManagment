import React, { useEffect, useState } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Calendar as CalendarIcon, CheckSquare, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'Assignment' | 'Session' | 'Class';
  date: string;
  courseName: string;
}

export const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${API_URL}/courses/student`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (res.ok) {
          const courses = await res.json();
          const items: CalendarEvent[] = [];

          courses.forEach((c: any) => {
            if (c.sessions) {
              c.sessions.forEach((s: any) => {
                items.push({
                  id: s.id,
                  title: s.title,
                  type: 'Session',
                  date: s.createdAt,
                  courseName: c.name,
                });

                if (s.tasks) {
                  s.tasks.forEach((t: any) => {
                    items.push({
                      id: t.id,
                      title: t.title,
                      type: 'Assignment',
                      date: t.deadline,
                      courseName: c.name,
                    });
                  });
                }
              });
            }
          });

          setEvents(items);
        }
      } catch (err) {
        console.error('Failed to load calendar events', err);
      }
    };

    fetchCalendarEvents();
  }, [user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-violet-400" />
              Academic Deadlines & Schedule Calendar
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-[#121215] border border-[#24242B] p-1.5 rounded-xl">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-[#1A1A20] text-zinc-400 hover:text-white rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white px-2">
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-[#1A1A20] text-zinc-400 hover:text-white rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-zinc-400 border-b border-[#1F1F26] pb-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-[#0D0D10]/50 rounded-xl border border-transparent" />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.date && e.date.startsWith(dateStr));
              const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();

              return (
                <div
                  key={dayNum}
                  className={`h-24 p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    isToday
                      ? 'bg-violet-600/10 border-violet-500/50 text-violet-300'
                      : 'bg-[#17171C] border-[#22222A] text-zinc-300 hover:border-[#2D2D38]'
                  }`}
                >
                  <span className={`text-xs font-bold ${isToday ? 'text-violet-400' : 'text-zinc-400'}`}>{dayNum}</span>

                  <div className="space-y-1 overflow-y-auto max-h-14">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-[9px] p-1 rounded font-medium truncate flex items-center gap-1 ${
                          ev.type === 'Assignment'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                        title={`${ev.title} (${ev.courseName})`}
                      >
                        {ev.type === 'Assignment' ? <CheckSquare className="w-2.5 h-2.5 shrink-0" /> : <Layers className="w-2.5 h-2.5 shrink-0" />}
                        <span className="truncate">{ev.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
};
