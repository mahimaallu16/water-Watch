import React, { useState, useEffect } from 'react';
import { Bell, User, LogOut, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { formatRelativeTime } from '../../utils/formatters';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ portalTitle = 'WaterWatch Platform', onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifs = async () => {
    try {
      const countRes = await notificationService.getUnreadCount();
      setUnreadCount(countRes.unread_count);
      if (showNotifs) {
        const list = await notificationService.getNotifications(10);
        setNotifications(list);
      }
    } catch (e) {
      // Ignore background errors
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [showNotifs]);

  const handleOpenNotifs = async () => {
    const nextState = !showNotifs;
    setShowNotifs(nextState);
    if (nextState) {
      try {
        const list = await notificationService.getNotifications(10);
        setNotifications(list);
      } catch (e) {}
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{portalTitle}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
        <ThemeToggle variant="segmented" />

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleOpenNotifs}
            className="navbar-icon-btn"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="navbar-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-500, #0284c7)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{n.title}</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatRelativeTime(n.created_at)}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', marginTop: 4, lineHeight: 1.4, opacity: 0.85 }}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}
          >
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div style={{ display: 'none', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user?.full_name}</span>
            <span style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>{user?.role}</span>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="navbar-logout-btn"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

