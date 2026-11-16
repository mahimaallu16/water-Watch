import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Droplet,
  LayoutDashboard,
  PlusCircle,
  FileText,
  MapPin,
  User,
  AlertTriangle,
  Copy,
  Users,
  BarChart3,
  ShieldCheck,
  Wrench,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || 'citizen';

  const citizenNav = [
    { to: '/citizen', label: 'Resident Home', icon: LayoutDashboard },
    { to: '/citizen/new-report', label: 'Report Water Leak', icon: PlusCircle },
    { to: '/citizen/my-reports', label: 'My Submissions', icon: FileText },
    { to: '/citizen/nearby', label: 'Nearby Map', icon: MapPin },
    { to: '/citizen/profile', label: 'Profile & Alerts', icon: User }
  ];

  const adminNav = [
    { to: '/admin', label: 'Command Center', icon: LayoutDashboard },
    { to: '/admin/reports', label: 'Citizen Reports', icon: FileText },
    { to: '/admin/duplicates', label: 'Duplicate Review', icon: Copy },
    { to: '/admin/incidents', label: 'Active Incidents', icon: AlertTriangle },
    { to: '/admin/map', label: 'Geospatial Map', icon: MapPin },
    { to: '/admin/workers', label: 'Field Staff', icon: Users },
    { to: '/admin/analytics', label: 'Analytics & KPIs', icon: BarChart3 },
    { to: '/admin/audit', label: 'Audit Trail', icon: ShieldCheck }
  ];

  const workerNav = [
    { to: '/worker', label: 'Field Dashboard', icon: LayoutDashboard },
    { to: '/worker/tasks', label: 'My Assignments', icon: Wrench },
    { to: '/worker/history', label: 'Completed Jobs', icon: CheckCircle },
    { to: '/citizen/profile', label: 'Technician Profile', icon: User }
  ];

  let items = citizenNav;
  if (role === 'admin') items = adminNav;
  else if (role === 'worker') items = workerNav;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-logo">
          <Droplet size={22} fill="white" />
        </div>
        <div className="brand-text">
          <h1>WaterWatch</h1>
          <p>{role.toUpperCase()} PORTAL</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/citizen' || item.to === '/admin' || item.to === '/worker'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-snippet">
          <div className="user-avatar">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-meta">
            <div className="name">{user?.full_name || 'Logged User'}</div>
            <div className="role-pill">{role} account</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

