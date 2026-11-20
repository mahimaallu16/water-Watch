import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Register() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'citizen',
    address: ''
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
      await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        password: formData.password,
        role: 'citizen',
        address: formData.address.trim() || null
      });
      showToast('Registration successful! Logging you in...', 'success');
      await login(formData.email, formData.password);
      navigate('/citizen');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
        Resident Registration
      </h2>
      <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.5rem' }}>
        Join your community water monitoring network to report leaks and track repairs
      </p>

      <form onSubmit={handleRegister}>
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
            placeholder="e.g. resident@example.com"
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
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

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

        <div className="form-group">
          <label>Password (Min 8 chars)</label>
          <input
            type="password"
            name="password"
            className="form-control"
            placeholder="Choose a secure password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={submitting}
        >
          {submitting ? 'Creating Account...' : 'Complete Resident Registration'}
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
