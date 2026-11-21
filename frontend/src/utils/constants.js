export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const PROBLEM_CATEGORIES = [
  { value: 'pipe_leak', label: 'Suspected Pipe Leak', description: 'Cracked, burst, or punctured water pipeline' },
  { value: 'overflow', label: 'Street Overflow / Flooding', description: 'Active surface overflow or drainage pooling' },
  { value: 'damaged_valve', label: 'Damaged Control Valve', description: 'Leaking, broken, or stuck municipal valve or meter' },
  { value: 'low_pressure', label: 'Low Water Pressure', description: 'Severe drop or loss of water supply to property' },
  { value: 'contamination', label: 'Water Contamination / Murkiness', description: 'Discolored, sediment-heavy, or foul-smelling tap water' },
  { value: 'other', label: 'Other Water Issue', description: 'Hydrant issues, illegal tap, open main chamber' }
];

export const COMMON_PROBLEMS = [
  {
    category: 'pipe_leak',
    id: 'pipe_leak_burst',
    label: 'Main Pipe Burst / Underground Pipeline Rupture',
    defaultTitle: 'Main Underground Pipe Burst',
    descriptions: [
      'Water is actively gushing from a cracked or ruptured underground municipal pipeline, causing street flooding and pooling.',
      'High-pressure water geyser spraying into the air from a broken main distribution pipe.',
      'Persistent underground leakage causing road depression and water seepage.'
    ]
  },
  {
    category: 'pipe_leak',
    id: 'pipe_leak_pavement',
    label: 'Water Bubbling Up Through Road / Pavement',
    defaultTitle: 'Water Bubbling Through Pavement',
    descriptions: [
      'Water is actively bubbling up through cracks in the asphalt or pedestrian sidewalk with constant pressure.',
      'Subsurface pipe leak eroding pavement foundation with continuous water emergence.'
    ]
  },
  {
    category: 'pipe_leak',
    id: 'pipe_leak_visible',
    label: 'Visible Pipe Crack, Puncture, or Joint Leak',
    defaultTitle: 'Visible Pipeline Joint / Crack Leakage',
    descriptions: [
      'Water is spraying or dripping heavily from an exposed or overhead municipal water distribution pipe joint.',
      'Cracked pipe section leaking steady stream near building entrance or road edge.'
    ]
  },
  {
    category: 'overflow',
    id: 'overflow_drain',
    label: 'Drainage / Storm Chamber Overflowing with Clean Water',
    defaultTitle: 'Storm Drain Overflowing Clean Water',
    descriptions: [
      'Municipal water supply line leak is overflowing into the drainage chamber and flooding the street.',
      'Sump or drain chamber filled to capacity and overflowing clean municipal water onto sidewalk.'
    ]
  },
  {
    category: 'overflow',
    id: 'overflow_street',
    label: 'Extensive Street Flooding & Water Pooling',
    defaultTitle: 'Street Flooding from Water Main',
    descriptions: [
      'Water accumulation across traffic lanes due to continuous municipal supply overflow.',
      'Deep stagnant puddle formed by unresolved water supply leak blocking neighborhood access.'
    ]
  },
  {
    category: 'overflow',
    id: 'overflow_tank',
    label: 'Public / Community Water Tank Overflowing',
    defaultTitle: 'Public Water Reservoir Overflow',
    descriptions: [
      'Overhead public water tank or booster pump reservoir is continuously overflowing due to faulty float valve.'
    ]
  },
  {
    category: 'damaged_valve',
    id: 'valve_control',
    label: 'Broken / Jammed Street Control Valve',
    defaultTitle: 'Broken Municipal Gate Valve',
    descriptions: [
      'Municipal shutoff gate valve is broken, stuck in position, or spraying pressurized water from the bonnet.',
      'Underground valve wheel missing or sheared off, preventing flow regulation.'
    ]
  },
  {
    category: 'damaged_valve',
    id: 'valve_meter',
    label: 'Leaking Water Meter or Utility Box Connection',
    defaultTitle: 'Leaking Water Meter Assembly',
    descriptions: [
      'Continuous leak at the water meter union / junction box flooding the surrounding ground.',
      'Cracked meter glass or leaking inlet valve spraying water inside meter pit.'
    ]
  },
  {
    category: 'damaged_valve',
    id: 'valve_air',
    label: 'Defective Air Release / Pressure Regulating Valve',
    defaultTitle: 'Defective Air Release Valve Hissing & Spraying',
    descriptions: [
      'Air release valve is stuck open, hissing loudly and spraying continuous water mist.'
    ]
  },
  {
    category: 'low_pressure',
    id: 'pressure_zero',
    label: 'Complete Supply Outage (No Water from Taps)',
    defaultTitle: 'Complete Water Supply Outage',
    descriptions: [
      'Taps have run completely dry with zero water supply during scheduled distribution hours across the neighborhood.',
      'Unexpected supply interruption lasting several hours without prior municipal notice.'
    ]
  },
  {
    category: 'low_pressure',
    id: 'pressure_low',
    label: 'Severely Low Water Pressure (Trickle Only)',
    defaultTitle: 'Low Water Pressure Across Household/Area',
    descriptions: [
      'Water pressure is severely degraded to a slow trickle, insufficient to fill storage tanks or run household appliances.',
      'Gradual drop in main line pressure over recent days affecting upper floors.'
    ]
  },
  {
    category: 'low_pressure',
    id: 'pressure_airlock',
    label: 'Air Locks / Sputtering Water Flow',
    defaultTitle: 'Sputtering Supply and Air Locks in Pipeline',
    descriptions: [
      'Supply line has severe air locks causing loud hammering in pipes and sputtering, erratic flow.'
    ]
  },
  {
    category: 'contamination',
    id: 'contam_muddy',
    label: 'Muddy, Brown, or Rust-Colored Water',
    defaultTitle: 'Discolored / Muddy Tap Water',
    descriptions: [
      'Tap water is brown, yellowish, or muddy with high turbidity, unsuitable for drinking or domestic use.',
      'Heavy red rust and silt particles discharging from taps when water supply is turned on.'
    ]
  },
  {
    category: 'contamination',
    id: 'contam_odor',
    label: 'Foul-Smelling or Chemically Tainted Water',
    defaultTitle: 'Foul Odor / Contaminated Water Supply',
    descriptions: [
      'Water has a strong sewage, sulfur, or chemical odor and is unsafe for drinking or household use.',
      'Pungent chemical or excessive chlorine odor rendering water unsafe for consumption.'
    ]
  },
  {
    category: 'contamination',
    id: 'contam_sediment',
    label: 'Visible Foreign Sediment or Sand in Water',
    defaultTitle: 'Suspended Sand and Debris in Water',
    descriptions: [
      'Black grit, sand, or foreign floating debris observed settling at the bottom of water containers and filters.'
    ]
  },
  {
    category: 'other',
    id: 'other_hydrant',
    label: 'Damaged, Open, or Leaking Fire Hydrant',
    defaultTitle: 'Damaged / Gushing Fire Hydrant',
    descriptions: [
      'Fire hydrant has been struck, opened, or vandalized, releasing a high-volume torrent into the roadway.'
    ]
  },
  {
    category: 'other',
    id: 'other_manhole',
    label: 'Open or Broken Water Chamber Lid / Hazard',
    defaultTitle: 'Broken Water Utility Chamber Cover',
    descriptions: [
      'Water distribution chamber or manhole cover is broken or missing, posing an immediate physical hazard to pedestrians.'
    ]
  },
  {
    category: 'other',
    id: 'other_illegal',
    label: 'Unauthorized / Illegal Pipe Tapping',
    defaultTitle: 'Illegal Connection on Main Pipeline',
    descriptions: [
      'Unregulated bypass or illegal pipe tapping observed on municipal transmission line.'
    ]
  },
  {
    category: 'other',
    id: 'other_custom',
    label: 'Custom Problem (Specify Details Manually)',
    defaultTitle: '',
    descriptions: [
      ''
    ]
  }
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

