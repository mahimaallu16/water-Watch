import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

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

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
        Sign In
      </h2>
      <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.5rem' }}>
        Access your role-based portal on WaterWatch
      </p>

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
        New community resident?{' '}
        <Link to="/register" style={{ color: '#0284c7', fontWeight: 600 }}>
          Create an account
        </Link>
      </div>
    </div>
  );
}
