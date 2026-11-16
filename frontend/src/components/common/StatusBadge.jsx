import React from 'react';
import { REPORT_STATUSES, INCIDENT_STATUSES } from '../../utils/constants';

export default function StatusBadge({ status, type = 'report' }) {
  const dict = type === 'incident' ? INCIDENT_STATUSES : REPORT_STATUSES;
  const config = dict[status] || { label: status, color: 'gray' };

  return (
    <span className={`badge badge-${config.color}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'currentColor'
        }}
      />
      {config.label}
    </span>
  );
}

