import { describe, expect, it } from 'vitest';
import { formatActivity, formatDistance, formatTimeLeft } from './format';

describe('format', () => {
  it('words rounded distances', () => {
    expect(formatDistance({ km: 1, under: true })).toBe('under 1 km');
    expect(formatDistance({ km: 4, under: false })).toBe('~4 km');
  });

  it('never says "online now"', () => {
    expect(formatActivity('today')).toBe('active today');
    expect(formatActivity('this_week')).toBe('active this week');
    expect(formatActivity(null)).toBeNull();
  });

  it('counts down live tags', () => {
    const now = Date.UTC(2026, 9, 23, 12);
    expect(formatTimeLeft(new Date(now + 35 * 60_000).toISOString(), now)).toBe('35m left');
    expect(formatTimeLeft(new Date(now + 150 * 60_000).toISOString(), now)).toBe('3h left');
  });
});
