import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/AppLayout';
import { Loader2 } from 'lucide-react';

// Lazy-loaded page components
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const CoursesList = lazy(() => import('./pages/CoursesList').then(m => ({ default: m.CoursesList })));
const CourseDetails = lazy(() => import('./pages/CourseDetails').then(m => ({ default: m.CourseDetails })));
const CourseMembers = lazy(() => import('./pages/CourseMembers').then(m => ({ default: m.CourseMembers })));
const TaskWorkspace = lazy(() => import('./pages/TaskWorkspace').then(m => ({ default: m.TaskWorkspace })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const StudentProfile = lazy(() => import('./pages/StudentProfile').then(m => ({ default: m.StudentProfile })));
const TeacherProfile = lazy(() => import('./pages/TeacherProfile').then(m => ({ default: m.TeacherProfile })));
const TeacherAnalytics = lazy(() => import('./pages/TeacherAnalytics').then(m => ({ default: m.TeacherAnalytics })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const TeacherPendingReviews = lazy(() => import('./pages/TeacherPendingReviews').then(m => ({ default: m.TeacherPendingReviews })));
const TeacherStudents = lazy(() => import('./pages/TeacherStudents').then(m => ({ default: m.TeacherStudents })));
const TwoPanelGradingWorkspace = lazy(() => import('./pages/TwoPanelGradingWorkspace').then(m => ({ default: m.TwoPanelGradingWorkspace })));
const AssignmentsList = lazy(() => import('./pages/AssignmentsList').then(m => ({ default: m.AssignmentsList })));
const Archive = lazy(() => import('./pages/Archive').then(m => ({ default: m.Archive })));
const ActivityLogPage = lazy(() => import('./pages/ActivityLog').then(m => ({ default: m.ActivityLogPage })));
const AdminTeachers = lazy(() => import('./pages/AdminTeachers').then(m => ({ default: m.AdminTeachers })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserManagement = lazy(() => import('./pages/UserManagement').then(m => ({ default: m.UserManagement })));
const SystemSettings = lazy(() => import('./pages/SystemSettings').then(m => ({ default: m.SystemSettings })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));

const PageLoader = () => (
  <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-zinc-500">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
    <p className="text-xs">Loading page...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs">Authenticating session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-2" />
      </div>
    );
  }

  if (!user || (user.role !== 'Teacher' && user.role !== 'Admin')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-2" />
      </div>
    );
  }

  if (!user || user.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const ProfileRouter: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'Teacher') {
    return <TeacherProfile />;
  }
  return <StudentProfile />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <CoursesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId"
                element={
                  <ProtectedRoute>
                    <CourseDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId/members"
                element={
                  <ProtectedRoute>
                    <CourseMembers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/task/:taskId"
                element={
                  <ProtectedRoute>
                    <TaskWorkspace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileRouter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/pending-reviews"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <TeacherPendingReviews />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/teacher/students"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <TeacherStudents />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/assignment/:taskId/review"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <TwoPanelGradingWorkspace />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/grading-workspace/:taskId"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <TwoPanelGradingWorkspace />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/assignments"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <AssignmentsList />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <TeacherAnalytics />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/archive"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <Archive />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/activity-log"
                element={
                  <TeacherRoute>
                    <ProtectedRoute>
                      <ActivityLogPage />
                    </ProtectedRoute>
                  </TeacherRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/teachers"
                element={
                  <AdminRoute>
                    <ProtectedRoute>
                      <AdminTeachers />
                    </ProtectedRoute>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <ProtectedRoute>
                      <UserManagement />
                    </ProtectedRoute>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminRoute>
                    <ProtectedRoute>
                      <SystemSettings />
                    </ProtectedRoute>
                  </AdminRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

