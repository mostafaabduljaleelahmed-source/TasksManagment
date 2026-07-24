import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CoursesList } from './pages/CoursesList';
import { CourseDetails } from './pages/CourseDetails';
import { CourseMembers } from './pages/CourseMembers';
import { TaskWorkspace } from './pages/TaskWorkspace';
import { Dashboard } from './pages/Dashboard';
import { StudentProfile } from './pages/StudentProfile';
import { TeacherProfile } from './pages/TeacherProfile';
import { TeacherAnalytics } from './pages/TeacherAnalytics';
import { Leaderboard } from './pages/Leaderboard';
import { Settings } from './pages/Settings';
import { TeacherPendingReviews } from './pages/TeacherPendingReviews';
import { TeacherStudents } from './pages/TeacherStudents';
import { AssignmentReview } from './pages/AssignmentReview';
import { AssignmentsList } from './pages/AssignmentsList';
import { Archive } from './pages/Archive';
import { ActivityLogPage } from './pages/ActivityLog';
import { AppLayout } from './components/AppLayout';
import { Loader2 } from 'lucide-react';

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

  if (!user || user.role !== 'Teacher') {
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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
              path="/teacher/pending-reviews"
              element={
                <TeacherRoute>
                  <TeacherPendingReviews />
                </TeacherRoute>
              }
            />
            <Route
              path="/teacher/students"
              element={
                <TeacherRoute>
                  <TeacherStudents />
                </TeacherRoute>
              }
            />
            <Route
              path="/assignment/:taskId/review"
              element={
                <TeacherRoute>
                  <AssignmentReview />
                </TeacherRoute>
              }
            />
            <Route
              path="/assignments"
              element={
                <TeacherRoute>
                  <AssignmentsList />
                </TeacherRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <TeacherRoute>
                  <TeacherAnalytics />
                </TeacherRoute>
              }
            />
            <Route
              path="/archive"
              element={
                <TeacherRoute>
                  <Archive />
                </TeacherRoute>
              }
            />
            <Route
              path="/activity-log"
              element={
                <ProtectedRoute>
                  <ActivityLogPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
