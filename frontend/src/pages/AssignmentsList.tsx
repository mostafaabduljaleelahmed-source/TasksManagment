import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTranslation } from '../utils/i18n';
import { Navbar } from '../components/Navbar';
import {
  FileCode, Calendar, Award, Users, Search,
  Loader2, ArrowRight, BookOpen
} from 'lucide-react';

interface AssignmentItem {
  id: string;
  title: string;
  deadline: string;
  maxGrade: number;
  totalStudents: number;
  submitted: number;
  missing: number;
  pendingReview: number;
  averageGrade: number;
  courseName: string;
  sessionName: string;
}

export const AssignmentsList: React.FC = () => {
  const { user } = useAuth();
  const { isRtl } = useTranslation();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAssignments = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard/teacher/assignments`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load assignments');
      const data = await res.json();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Error loading assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const filteredAssignments = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.sessionName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F26] pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <FileCode className="w-6 h-6 text-violet-500" />
              Assignment Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Overview of all active course assignments, submission status, and class performance.</p>
          </div>

          <div className="relative">
            <Search className={`w-4 h-4 text-zinc-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder="Search assignment, course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-[#1A1A20] border border-[#292933] rounded-xl text-xs text-white py-2 ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} focus:outline-none focus:border-violet-500 w-64`}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
            <p className="text-xs">Loading assignment overview...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center text-xs">
            {error}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-[#121215] border border-[#24242B] rounded-2xl p-12 text-center text-zinc-500 space-y-3">
            <FileCode className="w-12 h-12 mx-auto text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-zinc-300">No Assignments Found</p>
            <p className="text-xs text-zinc-500">There are no published assignments matching your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const isExpired = new Date(assignment.deadline) < new Date();
              return (
                <div
                  key={assignment.id}
                  onClick={() => navigate(`/assignment/${assignment.id}/review`)}
                  className="bg-[#121215] hover:bg-[#16161C] border border-[#24242B] hover:border-violet-500/40 rounded-2xl p-6 shadow-xl cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-5 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-violet-400" />
                        {assignment.courseName}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        {assignment.maxGrade} pts
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                      {assignment.title}
                    </h3>
                    <p className="text-xs text-zinc-400">Session: {assignment.sessionName}</p>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Deadline:</span>
                      <span className={`font-mono text-[11px] ${isExpired ? 'text-rose-400 font-bold' : 'text-zinc-300'}`}>
                        {new Date(assignment.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Comprehensive Assignment Metrics Grid */}
                  <div className="pt-4 border-t border-[#1F1F26] space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-[#1A1A20] border border-[#292933] rounded-xl">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                          <Users className="w-3 h-3 text-violet-400" /> Total Students
                        </span>
                        <span className="font-extrabold text-white text-sm">{assignment.totalStudents}</span>
                      </div>

                      <div className="p-2.5 bg-[#1A1A20] border border-[#292933] rounded-xl">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-400" /> Avg Grade
                        </span>
                        <span className="font-extrabold text-amber-400 text-sm">{assignment.averageGrade}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <div className="p-2 bg-[#1A1A20] border border-[#292933] rounded-xl text-center">
                        <span className="text-[9px] font-bold text-emerald-400 block uppercase">Submitted</span>
                        <span className="font-mono font-bold text-emerald-400">{assignment.submitted}</span>
                      </div>
                      <div className="p-2 bg-[#1A1A20] border border-[#292933] rounded-xl text-center">
                        <span className="text-[9px] font-bold text-rose-400 block uppercase">Missing</span>
                        <span className="font-mono font-bold text-rose-400">{assignment.missing}</span>
                      </div>
                      <div className="p-2 bg-[#1A1A20] border border-[#292933] rounded-xl text-center">
                        <span className="text-[9px] font-bold text-amber-400 block uppercase">Pending</span>
                        <span className="font-mono font-bold text-amber-400">{assignment.pendingReview}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs font-bold text-violet-400 group-hover:translate-x-1 transition-transform">
                      <span>Open Assignment Overview</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
