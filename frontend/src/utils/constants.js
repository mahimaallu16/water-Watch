export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const PROBLEM_CATEGORIES = [
  { value: 'pipe_leak', label: 'Suspected Pipe Leak', description: 'Cracked, burst, or punctured water pipeline' },
  { value: 'overflow', label: 'Street Overflow / Flooding', description: 'Active surface overflow or drainage pooling' },
  { value: 'damaged_valve', label: 'Damaged Control Valve', description: 'Leaking, broken, or stuck municipal valve or meter' },
  { value: 'low_pressure', label: 'Low Water Pressure', description: 'Severe drop or loss of water supply to property' },
  { value: 'contamination', label: 'Water Contamination / Murkiness', description: 'Discolored, sediment-heavy, or foul-smelling tap water' },
  { value: 'other', label: 'Other Water Issue', description: 'Hydrant issues, illegal tap, open main chamber' }
];

export const FLOW_RATES = [
  { value: 'trickle', label: 'Slow Trickle / Seepage (< 1 L/min)', points: 5 },
  { value: 'moderate_stream', label: 'Steady Stream (1 - 20 L/min)', points: 15 },
  { value: 'heavy_flow', label: 'Heavy Torrent (20 - 100 L/min)', points: 25 },
  { value: 'gushing_geyser', label: 'Gushing Geyser (> 100 L/min)', points: 35 }
];

export const REPORT_STATUSES = {
  submitted: { label: 'Submitted', color: 'blue', desc: 'Received and queued for review' },
  under_review: { label: 'Under Review', color: 'yellow', desc: 'Administrator inspecting report' },
  linked: { label: 'Linked to Incident', color: 'purple', desc: 'Associated with active field incident' },
  resolved: { label: 'Resolved', color: 'green', desc: 'Repair verified and completed' },
  rejected: { label: 'Rejected', color: 'red', desc: 'Out of scope or invalid' }
};

export const INCIDENT_STATUSES = {
  investigating: { label: 'Investigating', color: 'yellow' },
  assigned: { label: 'Assigned to Worker', color: 'blue' },
  in_progress: { label: 'Repair In Progress', color: 'indigo' },
  work_submitted: { label: 'Awaiting Verification', color: 'purple' },
  resolved: { label: 'Verified & Resolved', color: 'green' },
  closed: { label: 'Closed', color: 'gray' }
};

export const SEVERITY_LEVELS = {
  critical: { label: 'Critical', color: 'red', badgeClass: 'badge-critical' },
  high: { label: 'High', color: 'orange', badgeClass: 'badge-high' },
  medium: { label: 'Medium', color: 'yellow', badgeClass: 'badge-medium' },
  low: { label: 'Low', color: 'blue', badgeClass: 'badge-low' }
};

export const PRIORITY_LEVELS = {
  p1: { label: 'P1 — Emergency', turnaround: '< 4 hours', color: 'red' },
  p2: { label: 'P2 — Urgent', turnaround: '< 12 hours', color: 'orange' },
  p3: { label: 'P3 — Standard', turnaround: '< 24 hours', color: 'yellow' },
  p4: { label: 'P4 — Scheduled', turnaround: '< 48 hours', color: 'blue' }
};

export const ZONES = ['Central', 'North', 'South', 'East', 'West'];

