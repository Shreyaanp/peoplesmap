import type { Distance, LatLng } from '../../api/types';

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Web Mercator tile z/x/y to its lat/lng bounds. */
export function tileBounds(z: number, x: number, y: number): Bounds {
  const n = 2 ** z;
  const lng = (tx: number) => (tx / n) * 360 - 180;
  const lat = (ty: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI;
  return { west: lng(x), east: lng(x + 1), north: lat(y), south: lat(y + 1) };
}

export function contains(bounds: Bounds, point: LatLng): boolean {
  return (
    point.lng >= bounds.west &&
    point.lng < bounds.east &&
    point.lat > bounds.south &&
    point.lat <= bounds.north
  );
}

export function parseBbox(value: string): Bounds | undefined {
  const parts = value.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [west = 0, south = 0, east = 0, north = 0] = parts;
  return { west, south, east, north };
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The contract's rounding: "under 1 km", then whole km up to 10, then the nearest 5 km. */
export function roundDistance(km: number): Distance {
  if (km < 1) return { km: 1, under: true };
  if (km <= 10) return { km: Math.round(km), under: false };
  return { km: Math.round(km / 5) * 5, under: false };
}

/** Moves a point by metres east and north (small distances only). */
export function offsetMetres(point: LatLng, east: number, north: number): LatLng {
  const lat = point.lat + north / 110_574;
  const lng = point.lng + east / (111_320 * Math.cos((point.lat * Math.PI) / 180));
  return { lat, lng };
}
