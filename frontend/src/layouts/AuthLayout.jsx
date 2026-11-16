import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Droplet } from 'lucide-react';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'worker') return <Navigate to="/worker" replace />;
    return <Navigate to="/citizen" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '2rem 1rem'
      }}
    >
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7, #075985)',
            color: 'white',
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)',
            marginBottom: '0.85rem'
          }}
        >
          <Droplet size={30} fill="white" />
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
          WaterWatch
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Community Water-Leak Reporting & Repair Coordination Platform
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          padding: '2rem'
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}

