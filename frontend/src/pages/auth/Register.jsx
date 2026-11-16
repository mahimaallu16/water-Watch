import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ZONES } from '../../utils/constants';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'citizen',
    address: '',
    department: 'Water Operations',
    zone: 'Central',
    specialization: 'General Plumbing'
  });
  const [submitting, setSubmitting] = useState(false);
  const { register, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(formData);
      showToast('Registration successful! Logging you in...', 'success');
      const user = await login(formData.email, formData.password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'worker') navigate('/worker');
      else navigate('/citizen');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
        Create Account
      </h2>
      <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.5rem' }}>
        Join your neighborhood water infrastructure network
      </p>

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Account Type / Role</label>
          <select
            name="role"
            className="form-control"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="citizen">Resident / Citizen</option>
            <option value="worker">Field Maintenance Technician</option>
          </select>
        </div>

        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="full_name"
            className="form-control"
            placeholder="e.g. Jane Doe"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            className="form-control"
            placeholder="jane@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number (Optional)</label>
          <input
            type="tel"
            name="phone"
            className="form-control"
            placeholder="+1-555-0100"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        {formData.role === 'citizen' && (
          <div className="form-group">
            <label>Residential Address / Locality</label>
            <input
              type="text"
              name="address"
              className="form-control"
              placeholder="e.g. 124 Pine Street, Apt 3B"
              value={formData.address}
              onChange={handleChange}
            />
          </div>
        )}

        {formData.role === 'worker' && (
          <>
            <div className="form-group">
              <label>Assigned Zone</label>
              <select
                name="zone"
                className="form-control"
                value={formData.zone}
                onChange={handleChange}
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z} Zone</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Specialization</label>
              <select
                name="specialization"
                className="form-control"
                value={formData.specialization}
                onChange={handleChange}
              >
                <option value="Main Line Repair">Main Line Repair</option>
                <option value="Valve Specialist">Valve Specialist</option>
                <option value="Emergency Response">Emergency Response</option>
                <option value="General Plumbing">General Plumbing</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            className="form-control"
            placeholder="Choose a secure password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={submitting}
        >
          {submitting ? 'Creating Account...' : 'Complete Registration'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#0284c7', fontWeight: 600 }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}

