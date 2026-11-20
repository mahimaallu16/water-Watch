import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, Mail, ArrowRight, Droplet, Wrench, ShieldCheck, Info } from 'lucide-react';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('citizen'); // 'citizen', 'worker', 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const roleMeta = {
    citizen: {
      title: 'Resident',
      color: '#0284c7',
      bgLight: '#f0f9ff',
      borderColor: '#bae6fd',
      textColor: '#0369a1',
      icon: Droplet,
      desc: 'Report water leaks, view community problem maps, and track repair status in real-time.',
      footerNote: 'New community resident?'
    },
    worker: {
      title: 'Field Worker',
      color: '#16a34a',
      bgLight: '#f0fdf4',
      borderColor: '#bbf7d0',
      textColor: '#166534',
      icon: Wrench,
      desc: 'Access assigned maintenance work orders, upload repair photo proofs, and report progress.',
      footerNote: 'Worker accounts are provisioned directly by Municipal Administrators.'
    },
    admin: {
      title: 'Administrator',
      color: '#7c3aed',
      bgLight: '#faf5ff',
      borderColor: '#e9d5ff',
      textColor: '#6b21a8',
      icon: ShieldCheck,
      desc: 'Operations command center: Incident dispatch, AI duplicate triage, staff management, and GIS analytics.',
      footerNote: 'Administrator access is restricted to authorized municipal operations staff.'
    }
  };

  const currentRole = roleMeta[selectedRole];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Please enter both your email address and password', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);

      // Verify that the user's registered role matches their selected portal role
      const userRole = (user.role || '').toLowerCase();
      const targetRole = selectedRole === 'citizen' ? ['citizen', 'resident'] : [selectedRole];

      if (!targetRole.includes(userRole)) {
        // Enforce strict role authorization boundary
        logout();
        showToast(
          `Access Denied: This account is registered as '${userRole.toUpperCase()}', not '${currentRole.title}'. Please select the correct portal tab.`,
          'error'
        );
        return;
      }

      showToast(`Welcome back, ${user.full_name}!`, 'success');
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'worker') navigate('/worker');
      else navigate('/citizen');
    } catch (err) {
      showToast(err.message || 'Login failed. Please verify your email and password.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>
        Sign In
      </h2>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
        Select your role and sign in to your authorized portal
      </p>

      {/* Role Selector Tabs (All roles clearly visible to everyone) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          marginBottom: '1rem',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px'
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedRole('citizen')}
          style={{
            padding: '8px 4px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: selectedRole === 'citizen' ? '#ffffff' : 'transparent',
            color: selectedRole === 'citizen' ? '#0284c7' : '#64748b',
            boxShadow: selectedRole === 'citizen' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Droplet size={17} />
          <span>Resident</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('worker')}
          style={{
            padding: '8px 4px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: selectedRole === 'worker' ? '#ffffff' : 'transparent',
            color: selectedRole === 'worker' ? '#16a34a' : '#64748b',
            boxShadow: selectedRole === 'worker' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Wrench size={17} />
          <span>Field Worker</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('admin')}
          style={{
            padding: '8px 4px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            background: selectedRole === 'admin' ? '#ffffff' : 'transparent',
            color: selectedRole === 'admin' ? '#7c3aed' : '#64748b',
            boxShadow: selectedRole === 'admin' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <ShieldCheck size={17} />
          <span>Admin</span>
        </button>
      </div>

      {/* Role Context & Description Banner */}
      <div
        style={{
          background: currentRole.bgLight,
          border: `1px solid ${currentRole.borderColor}`,
          borderRadius: '10px',
          padding: '0.65rem 0.85rem',
          marginBottom: '1.25rem',
          fontSize: '0.78rem',
          color: currentRole.textColor,
          lineHeight: 1.45,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <b>{currentRole.title} Portal:</b> {currentRole.desc}
        </div>
      </div>

      {/* Clean Form - Zero Leaked Credentials */}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
            {currentRole.title} Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              className="form-control"
              placeholder={`Enter your registered ${currentRole.title.toLowerCase()} email`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your secret password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ paddingLeft: '2.5rem' }}
            />
            <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          </div>
        </div>

        <button
          type="submit"
          className="btn"
          style={{
            width: '100%',
            marginTop: '0.5rem',
            backgroundColor: currentRole.color,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 700,
            padding: '0.75rem',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.15s ease'
          }}
          disabled={submitting}
        >
          {submitting ? (
            'Authenticating...'
          ) : (
            <>
              Sign In as {currentRole.title} <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
        {selectedRole === 'citizen' ? (
          <>
            {currentRole.footerNote}{' '}
            <Link to="/register" style={{ color: '#0284c7', fontWeight: 700 }}>
              Create an account
            </Link>
          </>
        ) : (
          <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
            🔒 {currentRole.footerNote}
          </span>
        )}
      </div>
    </div>
  );
}
