/**
 * Map data tiles. Each data tile is one zoom coarser than the display, so a phone screen needs about
 * four of them; small pans fetch only the new edge tiles and panning back costs nothing (cached).
 */

export interface Tile {
  z: number;
  x: number;
  y: number;
}

export interface ViewBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Glow tiles stop at z12 (H3 resolution 8); closer in, the people tiles take over. */
export const maxGlowDataZoom = 12;
export const minPeopleDataZoom = 13;
const maxTiles = 24;

function lngToX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** z);
}

function latToY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z);
}

export function tilesFor(bounds: ViewBounds, z: number): Tile[] {
  const n = 2 ** z;
  const clamp = (v: number) => Math.min(n - 1, Math.max(0, v));
  const [x0, x1] = [clamp(lngToX(bounds.west, z)), clamp(lngToX(bounds.east, z))];
  const [y0, y1] = [clamp(latToY(bounds.north, z)), clamp(latToY(bounds.south, z))];
  const tiles: Tile[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) tiles.push({ z, x, y });
  }
  // Nearest the centre first, so the middle of the screen fills in first.
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return tiles
    .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
    .slice(0, maxTiles);
}

export function glowDataZoom(zoom: number): number {
  return Math.min(maxGlowDataZoom, Math.max(4, Math.floor(zoom) - 1));
}

export function tileKey(tile: Tile): string {
  return `${tile.z}/${tile.x}/${tile.y}`;
}
