import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import CitizenLayout from './layouts/CitizenLayout';
import AdminLayout from './layouts/AdminLayout';
import WorkerLayout from './layouts/WorkerLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import NewReport from './pages/citizen/NewReport';
import MyReports from './pages/citizen/MyReports';
import ReportDetail from './pages/citizen/ReportDetail';
import NearbyProblems from './pages/citizen/NearbyProblems';
import CitizenProfile from './pages/citizen/CitizenProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ReportsQueue from './pages/admin/ReportsQueue';
import ReportReviewDetail from './pages/admin/ReportReviewDetail';
import DuplicateReview from './pages/admin/DuplicateReview';
import IncidentsList from './pages/admin/IncidentsList';
import IncidentDetail from './pages/admin/IncidentDetail';
import MapExplorer from './pages/admin/MapExplorer';
import WorkerManagement from './pages/admin/WorkerManagement';
import Analytics from './pages/admin/Analytics';
import AuditLogs from './pages/admin/AuditLogs';

// Worker Pages
import WorkerDashboard from './pages/worker/WorkerDashboard';
import TaskList from './pages/worker/TaskList';
import TaskDetail from './pages/worker/TaskDetail';
import WorkerHistory from './pages/worker/WorkerHistory';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'worker') return <Navigate to="/worker" replace />;
  return <Navigate to="/citizen" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Root Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            {/* Citizen Portal */}
            <Route path="/citizen" element={<CitizenLayout />}>
              <Route index element={<CitizenDashboard />} />
              <Route path="new-report" element={<NewReport />} />
              <Route path="my-reports" element={<MyReports />} />
              <Route path="reports/:id" element={<ReportDetail />} />
              <Route path="nearby" element={<NearbyProblems />} />
              <Route path="profile" element={<CitizenProfile />} />
            </Route>

            {/* Administrator Portal */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="reports" element={<ReportsQueue />} />
              <Route path="reports/:id" element={<ReportReviewDetail />} />
              <Route path="duplicates" element={<DuplicateReview />} />
              <Route path="incidents" element={<IncidentsList />} />
              <Route path="incidents/:id" element={<IncidentDetail />} />
              <Route path="map" element={<MapExplorer />} />
              <Route path="workers" element={<WorkerManagement />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="audit" element={<AuditLogs />} />
            </Route>

            {/* Field Worker Portal */}
            <Route path="/worker" element={<WorkerLayout />}>
              <Route index element={<WorkerDashboard />} />
              <Route path="tasks" element={<TaskList />} />
              <Route path="tasks/:id" element={<TaskDetail />} />
              <Route path="history" element={<WorkerHistory />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

