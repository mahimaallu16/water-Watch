import React from 'react';

export default function LoadingSpinner({ size = 28, text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', gap: '0.75rem' }}>
      <div
        style={{
          width: size,
          height: size,
          border: '3px solid #e2e8f0',
          borderTopColor: '#0284c7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {text && <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

