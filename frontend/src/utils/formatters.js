export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch (e) {
    return '';
  }
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getCategoryLabel(categoryKey) {
  const map = {
    pipe_leak: 'Suspected Pipe Leak',
    overflow: 'Street Overflow / Flooding',
    damaged_valve: 'Damaged Control Valve',
    low_pressure: 'Low Water Pressure',
    contamination: 'Water Contamination',
    other: 'Other Water Issue'
  };
  return map[categoryKey] || categoryKey;
}

export function getFlowLabel(flowKey) {
  const map = {
    trickle: 'Trickle / Seepage',
    moderate_stream: 'Moderate Stream',
    heavy_flow: 'Heavy Torrent',
    gushing_geyser: 'Gushing Geyser'
  };
  return map[flowKey] || flowKey;
}

