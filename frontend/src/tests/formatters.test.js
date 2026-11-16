import { describe, it, expect } from 'vitest';
import { getCategoryLabel, getFlowLabel, formatDistance } from '../utils/formatters';

describe('Formatters and Utilities', () => {
  it('should map problem categories to human readable labels', () => {
    expect(getCategoryLabel('pipe_leak')).toBe('Suspected Pipe Leak');
    expect(getCategoryLabel('damaged_valve')).toBe('Damaged Control Valve');
    expect(getCategoryLabel('overflow')).toBe('Street Overflow / Flooding');
    expect(getCategoryLabel('contamination')).toBe('Water Contamination');
  });

  it('should format flow rate intensities', () => {
    expect(getFlowLabel('trickle')).toBe('Trickle / Seepage');
    expect(getFlowLabel('gushing_geyser')).toBe('Gushing Geyser');
  });

  it('should format distances in meters and kilometers', () => {
    expect(formatDistance(45)).toBe('45 m');
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(5200)).toBe('5.2 km');
  });
});

