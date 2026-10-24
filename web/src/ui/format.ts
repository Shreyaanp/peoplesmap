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

/** When a message was sent, as short as the inbox needs: "now", "5m", "3h", "Mon", "12 Oct". */
export function formatSentAt(sentAt: string, now = Date.now()): string {
  const at = Date.parse(sentAt);
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  const options: Intl.DateTimeFormatOptions =
    minutes < 6 * 24 * 60 ? { weekday: 'short' } : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat('en-IN', options).format(at);
}

/** A message's time of day for its label: "7:42 pm". */
export function formatClock(sentAt: string): string {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(Date.parse(sentAt));
}
