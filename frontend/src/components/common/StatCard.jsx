import React from 'react';

export default function StatCard({ label, value, subtext, icon: Icon, color = 'blue' }) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <p>{label}</p>
        <div className="value">{value}</div>
        {subtext && <div className="subtext">{subtext}</div>}
      </div>
      {Icon && (
        <div className={`stat-icon ${color}`}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}

