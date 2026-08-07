import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  ShieldCheck, AlertTriangle, Database, CheckCircle2, RefreshCw, Loader2,
  AlertCircle, Wrench
} from 'lucide-react';

interface DatabaseHealthReport {
  overallHealthPercentage: number;
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalSessions: number;
  totalTasks: number;
  totalSubmissions: number;
  pendingReviews: number;
  brokenRecords: number;
  duplicateAttempts: number;
  orphanRecords: number;
  invalidGrades: number;
  leaderboardErrors: number;
  repairRequiredCount: number;
  auditLogDetails: string[];
  auditedAt: string;
}

export const AdminDatabaseHealth: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [report, setReport] = useState<DatabaseHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthReport = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/database-health`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch database health report');
      const data: DatabaseHealthReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching health report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthReport();
  }, [user]);

  const handleRunRepair = async () => {
    if (!window.confirm('Are you sure you want to run automatic transactional integrity repair? Valid student work will be preserved.')) return;

    setRepairing(true);
    try {
      const res = await fetch(`${API_URL}/admin/run-integrity-repair`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Integrity repair failed');
      toast.success(data.message || 'Integrity repair completed!');
      if (data.report) setReport(data.report);
      else fetchHealthReport();
    } catch (err: any) {
      toast.error(err.message || 'Error executing integrity repair');
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Admin' }, { label: 'Database Integrity' }]} />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Database className="w-6 h-6" />
            </span>
            Database Integrity & System Health
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time forensic health telemetry, database constraint audit, and automated repair tools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealthReport}
            disabled={loading || repairing}
            className="px-4 py-2 bg-[#111827] hover:bg-zinc-800 border border-[#374151] text-zinc-300 font-bold rounded-xl text-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Audit
          </button>

          <button
            onClick={handleRunRepair}
            disabled={repairing || loading}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs shadow-lg border border-emerald-400/40 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {repairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            Run Integrity Repair
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm text-zinc-400">Performing deep database audit...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-center">
          {error}
        </div>
      ) : report ? (
        <div className="space-y-6">
          
          {/* Overall Health Score Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black text-2xl border shadow-inner ${
                report.overallHealthPercentage >= 95
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : report.overallHealthPercentage >= 80
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}>
                <span>{report.overallHealthPercentage}%</span>
                <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">Health</span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  System Forensic Status:
                  {report.overallHealthPercentage >= 95 ? (
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Operational & Healthy</span>
                  ) : (
                    <span className="text-amber-400 font-extrabold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Action Required ({report.repairRequiredCount} Anomalies)</span>
                  )}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Last audited at: {new Date(report.auditedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-[#161E2E] px-4 py-2.5 rounded-2xl border border-[#1F2937]">
                <span className="text-zinc-500 text-[10px] block font-bold">Total Submissions</span>
                <span className="font-extrabold text-white text-base">{report.totalSubmissions}</span>
              </div>
              <div className="bg-[#161E2E] px-4 py-2.5 rounded-2xl border border-[#1F2937]">
                <span className="text-zinc-500 text-[10px] block font-bold">Pending Reviews</span>
                <span className="font-extrabold text-amber-400 text-base">{report.pendingReviews}</span>
              </div>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Students</span>
              <span className="text-xl font-extrabold text-white">{report.totalStudents}</span>
            </div>
            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Teachers</span>
              <span className="text-xl font-extrabold text-white">{report.totalTeachers}</span>
            </div>
            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Courses</span>
              <span className="text-xl font-extrabold text-white">{report.totalCourses}</span>
            </div>
            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Sessions</span>
              <span className="text-xl font-extrabold text-white">{report.totalSessions}</span>
            </div>
            <div className="bg-[#111827] border border-[#1F2937] p-4 rounded-2xl col-span-2 sm:col-span-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Tasks</span>
              <span className="text-xl font-extrabold text-white">{report.totalTasks}</span>
            </div>
          </div>

          {/* Forensic Anomaly Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${report.brokenRecords > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[#111827] border-[#1F2937] text-zinc-300'}`}>
              <span className="text-xs font-bold block">Broken Status Records</span>
              <span className="text-2xl font-black mt-1 block">{report.brokenRecords}</span>
            </div>

            <div className={`p-4 rounded-2xl border ${report.duplicateAttempts > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-[#111827] border-[#1F2937] text-zinc-300'}`}>
              <span className="text-xs font-bold block">Duplicate Attempt Keys</span>
              <span className="text-2xl font-black mt-1 block">{report.duplicateAttempts}</span>
            </div>

            <div className={`p-4 rounded-2xl border ${report.orphanRecords > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[#111827] border-[#1F2937] text-zinc-300'}`}>
              <span className="text-xs font-bold block">Orphan Records</span>
              <span className="text-2xl font-black mt-1 block">{report.orphanRecords}</span>
            </div>

            <div className={`p-4 rounded-2xl border ${report.invalidGrades > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-[#111827] border-[#1F2937] text-zinc-300'}`}>
              <span className="text-xs font-bold block">Invalid Grade Out-of-Bounds</span>
              <span className="text-2xl font-black mt-1 block">{report.invalidGrades}</span>
            </div>
          </div>

          {/* Audit Logs Details Panel */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400" />
              Detailed Forensic Audit Logs ({report.auditLogDetails.length})
            </h3>

            {report.auditLogDetails.length === 0 ? (
              <div className="p-6 bg-[#0B0F19] rounded-xl border border-[#1F2937] text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                No anomalies or database inconsistencies detected! System database is 100% healthy.
              </div>
            ) : (
              <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-4 font-mono text-xs text-amber-300 space-y-1.5 max-h-60 overflow-y-auto">
                {report.auditLogDetails.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 border-b border-[#1F2937]/50 pb-1">
                    <span className="text-zinc-500 select-none">[{idx + 1}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : null}
    </div>
  );
};
