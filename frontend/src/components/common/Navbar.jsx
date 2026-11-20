import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, LogOut, CheckCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { formatRelativeTime } from '../../utils/formatters';

export default function Navbar({ portalTitle = 'WaterWatch Platform', onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

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

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotifs(false);
      }
    };

    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await notificationService.markAsRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {}
    }
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{portalTitle}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
        {/* Notification Bell & Dropdown container */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={handleOpenNotifs}
            aria-label="View notifications"
            aria-expanded={showNotifs}
            style={{
              position: 'relative',
              background: showNotifs ? '#e2e8f0' : '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px white'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div
              style={{
                position: 'absolute',
                top: 48,
                right: 0,
                width: 360,
                maxWidth: 'calc(100vw - 2rem)',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 12px 30px -5px rgba(0,0,0,0.2), 0 0 1px 1px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0',
                zIndex: 1100,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px'
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px'
                      }}
                      title="Mark all notifications as read"
                    >
                      <CheckCheck size={14} /> Mark read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifs(false)}
                    aria-label="Close notifications"
                    title="Close"
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      width: 26,
                      height: 26,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderBottom: '1px solid #f8fafc',
                        backgroundColor: n.is_read ? 'white' : '#f0f9ff',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{n.title}</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatRelativeTime(n.created_at)}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4, lineHeight: 1.4 }}>
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
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{user?.full_name}</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>{user?.role}</span>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

