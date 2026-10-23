import type { LatLng } from '../../api/types';

/**
 * Neighbourhoods to pick from when you'd rather not share your location. Hyderabad only at launch;
 * picking one places you at its centre, snapped to about 500m like any neighbourhood location.
 */
export const areas: readonly { name: string; center: LatLng }[] = [
  { name: 'Abids', center: { lat: 17.393, lng: 78.476 } },
  { name: 'Ameerpet', center: { lat: 17.4375, lng: 78.4482 } },
  { name: 'Banjara Hills', center: { lat: 17.4156, lng: 78.4347 } },
  { name: 'Begumpet', center: { lat: 17.4447, lng: 78.4664 } },
  { name: 'Charminar', center: { lat: 17.3616, lng: 78.4747 } },
  { name: 'Dilsukhnagar', center: { lat: 17.3688, lng: 78.5247 } },
  { name: 'Financial District', center: { lat: 17.4145, lng: 78.3426 } },
  { name: 'Gachibowli', center: { lat: 17.4401, lng: 78.3489 } },
  { name: 'Himayatnagar', center: { lat: 17.401, lng: 78.487 } },
  { name: 'HITEC City', center: { lat: 17.4435, lng: 78.3772 } },
  { name: 'Jubilee Hills', center: { lat: 17.4325, lng: 78.4073 } },
  { name: 'Kokapet', center: { lat: 17.3963, lng: 78.3262 } },
  { name: 'Kompally', center: { lat: 17.536, lng: 78.484 } },
  { name: 'Kondapur', center: { lat: 17.4699, lng: 78.3578 } },
  { name: 'Kukatpally', center: { lat: 17.4948, lng: 78.3996 } },
  { name: 'LB Nagar', center: { lat: 17.3457, lng: 78.5522 } },
  { name: 'Madhapur', center: { lat: 17.4483, lng: 78.3915 } },
  { name: 'Manikonda', center: { lat: 17.4048, lng: 78.3866 } },
  { name: 'Mehdipatnam', center: { lat: 17.395, lng: 78.44 } },
  { name: 'Miyapur', center: { lat: 17.4968, lng: 78.3614 } },
  { name: 'Secunderabad', center: { lat: 17.4399, lng: 78.4983 } },
  { name: 'Somajiguda', center: { lat: 17.4239, lng: 78.4588 } },
  { name: 'Tarnaka', center: { lat: 17.428, lng: 78.539 } },
  { name: 'Tolichowki', center: { lat: 17.3986, lng: 78.4134 } },
  { name: 'Uppal', center: { lat: 17.4058, lng: 78.5591 } },
];
