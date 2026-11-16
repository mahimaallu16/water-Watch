import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.full_name}!`, 'success');
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'worker') navigate('/worker');
      else navigate('/citizen');
    } catch (err) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoAccount = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password123!');
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
        Sign In
      </h2>
      <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.5rem' }}>
        Access your role-based portal on WaterWatch
      </p>

      {/* Quick Demo Fill Buttons */}
      <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <UserCheck size={14} /> Quick Demo Accounts
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setDemoAccount('citizen@waterwatch.org')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Citizen
          </button>
          <button
            type="button"
            onClick={() => setDemoAccount('admin@waterwatch.org')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', borderColor: '#0284c7', color: '#0284c7' }}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setDemoAccount('worker@waterwatch.org')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', borderColor: '#16a34a', color: '#16a34a' }}
          >
            Field Worker
          </button>
        </div>
      </div>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email Address</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. resident@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ paddingLeft: '2.5rem' }}
            />
            <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          </div>
        </div>

        <div className="form-group">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingLeft: '2.5rem' }}
            />
            <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={submitting}
        >
          {submitting ? 'Authenticating...' : (
            <>
              Sign In to WaterWatch <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        New community member?{' '}
        <Link to="/register" style={{ color: '#0284c7', fontWeight: 600 }}>
          Create an account
        </Link>
      </div>
    </div>
  );
}

