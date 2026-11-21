import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { Mail, Lock, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, Droplet, Wrench, ShieldCheck } from 'lucide-react';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const queryRole = searchParams.get('role');
  const initialRole = ['citizen', 'worker', 'admin'].includes(queryRole) ? queryRole : 'citizen';

  const [activeRole, setActiveRole] = useState(initialRole);
  const [step, setStep] = useState(1); // 1: Request, 2: Reset Form, 3: Completed
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const roleMeta = {
    citizen: {
      title: 'Resident',
      color: '#0284c7',
      bgLight: '#f0f9ff',
      borderColor: '#bae6fd',
      textColor: '#0369a1',
      icon: Droplet
    },
    worker: {
      title: 'Field Worker',
      color: '#16a34a',
      bgLight: '#f0fdf4',
      borderColor: '#bbf7d0',
      textColor: '#166534',
      icon: Wrench
    },
    admin: {
      title: 'Administrator',
      color: '#7c3aed',
      bgLight: '#faf5ff',
      borderColor: '#e9d5ff',
      textColor: '#6b21a8',
      icon: ShieldCheck
    }
  };

  const currentTheme = roleMeta[activeRole] || roleMeta.citizen;
  const RoleIcon = currentTheme.icon;

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your registered email address.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.forgotPassword(email.trim().toLowerCase());
      setResetToken(res.reset_token || '');
      setResetCode(res.reset_code || '');
      if (res.role && roleMeta[res.role]) {
        setActiveRole(res.role);
      }
      showToast(res.message || 'Password reset instructions generated.', 'success');
      setStep(2);
    } catch (err) {
      showToast(err.message || 'Failed to request password reset. Please verify your email.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match. Please re-enter.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.resetPassword({
        token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
        email: email.trim().toLowerCase()
      });
      showToast(res.message || 'Password successfully updated!', 'success');
      setStep(3);
    } catch (err) {
      showToast(err.message || 'Failed to reset password. Token may have expired.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Step 1: Request Reset Token */}
      {step === 1 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: currentTheme.bgLight,
                color: currentTheme.color,
                border: `1px solid ${currentTheme.borderColor}`
              }}
            >
              <RoleIcon size={18} />
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Account Password Recovery
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Enter your registered email address to receive secure password reset instructions.
          </p>

          {/* Role Filter Tabs (Optional shortcut) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '6px',
              marginBottom: '1rem',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px'
            }}
          >
            {Object.entries(roleMeta).map(([roleKey, meta]) => {
              const Icon = meta.icon;
              const isSelected = activeRole === roleKey;
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setActiveRole(roleKey)}
                  style={{
                    padding: '6px 4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? meta.color : '#64748b',
                    boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={13} />
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>

          <div
            style={{
              background: currentTheme.bgLight,
              border: `1px solid ${currentTheme.borderColor}`,
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.78rem',
              color: currentTheme.textColor,
              lineHeight: 1.45
            }}
          >
            <b>{currentTheme.title} Recovery:</b> Password reset is available for Community Residents, Field Maintenance Workers, and Administrators.
          </div>

          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                {currentTheme.title} Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder={`Enter registered ${currentTheme.title.toLowerCase()} email`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn"
              style={{
                width: '100%',
                marginTop: '0.5rem',
                backgroundColor: currentTheme.color,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 700,
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer'
              }}
              disabled={submitting}
            >
              {submitting ? (
                'Verifying Account...'
              ) : (
                <>
                  Request Reset Instructions <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
            <Link
              to={`/login?role=${activeRole}`}
              style={{ color: currentTheme.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </>
      )}

      {/* Step 2: Set New Password */}
      {step === 2 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: currentTheme.bgLight,
                color: currentTheme.color,
                border: `1px solid ${currentTheme.borderColor}`
              }}
            >
              <KeyRound size={17} />
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Set New Password
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Resetting password for <b>{email}</b> ({currentTheme.title})
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.75rem 0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Verification Code
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: currentTheme.color, letterSpacing: '2px' }}>
                {resetCode || 'VERIFIED'}
              </div>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                color: currentTheme.textColor,
                background: currentTheme.bgLight,
                border: `1px solid ${currentTheme.borderColor}`,
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 700
              }}
            >
              {currentTheme.title} Portal
            </span>
          </div>

          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                New Secret Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Confirm your secret password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
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
                backgroundColor: currentTheme.color,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 700,
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer'
              }}
              disabled={submitting}
            >
              {submitting ? 'Updating Password...' : `Save New Password & Sign In as ${currentTheme.title}`}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.82rem' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ← Use a different email address
            </button>
          </div>
        </>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: currentTheme.bgLight,
              color: currentTheme.color,
              border: `1px solid ${currentTheme.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Password Reset Successful!
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Your <b>{currentTheme.title}</b> account password has been updated. You can now use your new credentials to sign in.
          </p>

          <button
            type="button"
            className="btn"
            onClick={() => navigate(`/login?role=${activeRole}`, { state: { role: activeRole } })}
            style={{
              width: '100%',
              backgroundColor: currentTheme.color,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 700,
              padding: '0.75rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Proceed to {currentTheme.title} Sign In <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
