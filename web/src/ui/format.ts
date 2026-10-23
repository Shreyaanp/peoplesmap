import type { Distance, TagLevel } from '../api/types';

/** "under 1 km" or "~3 km". The server already rounded; this only words it. */
export function formatDistance(distance: Distance): string {
  return distance.under ? `under ${distance.km} km` : `~${distance.km} km`;
}

export function formatActivity(activity: 'today' | 'this_week' | null | undefined): string | null {
  if (activity === 'today') return 'active today';
  if (activity === 'this_week') return 'active this week';
  return null;
}

export const levelLabel: Record<TagLevel, string> = {
  learning: 'Learning',
  doing: 'Doing',
  teaching: 'Teaching',
};

/** "2h left", "35m left": for live tags. */
export function formatTimeLeft(expiresAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((Date.parse(expiresAt) - now) / 60_000));
  if (minutes >= 60) return `${Math.round(minutes / 60)}h left`;
  return `${minutes}m left`;
}
