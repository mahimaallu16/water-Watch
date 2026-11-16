import React from 'react';
import { PRIORITY_LEVELS, SEVERITY_LEVELS } from '../../utils/constants';

export default function PriorityBadge({ priority, severity }) {
  if (priority) {
    const p = PRIORITY_LEVELS[priority?.toLowerCase()] || { label: priority, color: 'blue' };
    return (
      <span className={`badge badge-${p.color}`}>
        {p.label}
      </span>
    );
  }

  if (severity) {
    const s = SEVERITY_LEVELS[severity?.toLowerCase()] || { label: severity, color: 'blue' };
    return (
      <span className={`badge badge-${s.color}`}>
        {s.label} Severity
      </span>
    );
  }

  return null;
}

