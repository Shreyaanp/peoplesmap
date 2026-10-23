import type { LatLng } from '../../api/types';

export interface Locality {
  name: string;
  center: LatLng;
  /** Typical spread of people around the centre, in km. */
  spreadKm: number;
  /** Relative share of people living or hanging out here. */
  weight: number;
}

/** Real Hyderabad areas with approximate centres. The tech west is denser, like the real city. */
export const localities: readonly Locality[] = [
  { name: 'Gachibowli', center: { lat: 17.4401, lng: 78.3489 }, spreadKm: 1.4, weight: 14 },
  { name: 'Madhapur', center: { lat: 17.4483, lng: 78.3915 }, spreadKm: 1.2, weight: 13 },
  { name: 'HITEC City', center: { lat: 17.4435, lng: 78.3772 }, spreadKm: 0.9, weight: 9 },
  { name: 'Kondapur', center: { lat: 17.4699, lng: 78.3578 }, spreadKm: 1.2, weight: 10 },
  { name: 'Financial District', center: { lat: 17.4145, lng: 78.3426 }, spreadKm: 0.9, weight: 6 },
  { name: 'Kokapet', center: { lat: 17.3963, lng: 78.3262 }, spreadKm: 1.2, weight: 4 },
  { name: 'Manikonda', center: { lat: 17.4048, lng: 78.3866 }, spreadKm: 1.1, weight: 6 },
  { name: 'Jubilee Hills', center: { lat: 17.4325, lng: 78.4073 }, spreadKm: 1.2, weight: 8 },
  { name: 'Banjara Hills', center: { lat: 17.4156, lng: 78.4347 }, spreadKm: 1.3, weight: 8 },
  { name: 'Tolichowki', center: { lat: 17.3986, lng: 78.4134 }, spreadKm: 1.0, weight: 4 },
  { name: 'Mehdipatnam', center: { lat: 17.395, lng: 78.44 }, spreadKm: 1.0, weight: 4 },
  { name: 'Kukatpally', center: { lat: 17.4948, lng: 78.3996 }, spreadKm: 1.6, weight: 9 },
  { name: 'Miyapur', center: { lat: 17.4968, lng: 78.3614 }, spreadKm: 1.4, weight: 6 },
  { name: 'Ameerpet', center: { lat: 17.4375, lng: 78.4482 }, spreadKm: 0.9, weight: 6 },
  { name: 'Begumpet', center: { lat: 17.4447, lng: 78.4664 }, spreadKm: 1.0, weight: 4 },
  { name: 'Somajiguda', center: { lat: 17.4239, lng: 78.4588 }, spreadKm: 0.7, weight: 3 },
  { name: 'Secunderabad', center: { lat: 17.4399, lng: 78.4983 }, spreadKm: 1.5, weight: 6 },
  { name: 'Himayatnagar', center: { lat: 17.401, lng: 78.487 }, spreadKm: 0.8, weight: 3 },
  { name: 'Abids', center: { lat: 17.393, lng: 78.476 }, spreadKm: 0.8, weight: 3 },
  { name: 'Charminar', center: { lat: 17.3616, lng: 78.4747 }, spreadKm: 1.1, weight: 3 },
  { name: 'Tarnaka', center: { lat: 17.428, lng: 78.539 }, spreadKm: 1.1, weight: 3 },
  { name: 'Uppal', center: { lat: 17.4058, lng: 78.5591 }, spreadKm: 1.4, weight: 4 },
  { name: 'Dilsukhnagar', center: { lat: 17.3688, lng: 78.5247 }, spreadKm: 1.2, weight: 4 },
  { name: 'LB Nagar', center: { lat: 17.3457, lng: 78.5522 }, spreadKm: 1.3, weight: 3 },
  { name: 'Kompally', center: { lat: 17.536, lng: 78.484 }, spreadKm: 1.5, weight: 3 },
];

/** The launch area (Hyderabad metro). Outside it the API answers `outside-launch-area`. */
export const launchBounds = { west: 78.2, south: 17.2, east: 78.7, north: 17.65 } as const;

export function nearestLocality(point: LatLng): Locality {
  let best = localities[0];
  let bestDistance = Infinity;
  for (const locality of localities) {
    const d = (locality.center.lat - point.lat) ** 2 + (locality.center.lng - point.lng) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = locality;
    }
  }
  if (!best) throw new Error('No localities defined');
  return best;
}
