import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function WorkerLayout() {
  const { user, loading, isWorker } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Authenticating Worker Credentials..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Strict Server-Backed Role Verification:
  // Only accounts authorized as a 'worker' in the database can enter the Worker Portal.
  if (user.role !== 'worker') {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/citizen'} replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar portalTitle="Field Technician Dispatch Portal" />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
