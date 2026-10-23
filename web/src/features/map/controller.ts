import { addProtocol, Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cancelFrame, frame } from 'motion';
import { Protocol } from 'pmtiles';
import type { GlowCell, LatLng } from '../../api/types';
import { liquid, liquidEasing } from '../../motion/tokens';
import type { ThemeName } from '../../tokens';
import { createGlowLayer } from './glowLayer';
import { buildStyle, firstLabelLayerId } from './style';
import type { ViewBounds } from './tiles';

/**
 * The single bridge between React and MapLibre. React calls commands (fly to, set glows, theme);
 * the map reports view changes. Per-frame work runs on Motion's frame loop, never in React.
 */
export interface MapController {
  /** For the map feature's own overlays (pin positions). Everything else goes through commands. */
  readonly map: MapLibreMap;
  setGlowCells(cells: readonly GlowCell[], resolution: 6 | 7 | 8): void;
  flyTo(center: LatLng, zoom?: number): void;
  setTheme(theme: ThemeName): void;
  setReducedMotion(reduced: boolean): void;
  /** Called after every settled move (moveend), and once when the map loads. */
  onViewChange(listener: (view: MapView) => void): () => void;
  destroy(): void;
}

export interface MapView {
  zoom: number;
  bounds: ViewBounds;
  center: LatLng;
}

export interface MapControllerOptions {
  container: HTMLElement;
  center: LatLng;
  zoom: number;
  theme: ThemeName;
  reducedMotion: boolean;
}

/** Hyderabad and its surroundings; the camera never wanders off the launch city. */
const maxBounds: [[number, number], [number, number]] = [
  [77.9, 16.95],
  [79.0, 17.9],
];

let protocolAdded = false;
function ensureProtocol(): void {
  if (protocolAdded) return;
  addProtocol('pmtiles', new Protocol().tile);
  setWorkerUrl(workerUrl);
  protocolAdded = true;
}

export function createMapController(options: MapControllerOptions): MapController {
  ensureProtocol();
  let theme = options.theme;
  let reducedMotion = options.reducedMotion;
  const style = buildStyle(theme);
  const map = new MapLibreMap({
    container: options.container,
    style,
    center: [options.center.lng, options.center.lat],
    zoom: options.zoom,
    minZoom: 9,
    maxZoom: 18,
    maxBounds,
    attributionControl: { compact: true },
    // The base map is a backdrop for people: no tilt, no rotation.
    pitchWithRotate: false,
    dragRotate: false,
    touchPitch: false,
    fadeDuration: liquid.duration.short * 300,
  });
  map.touchZoomRotate.disableRotation();

  const glows = createGlowLayer();
  glows.setTheme(theme);
  glows.setStill(reducedMotion);

  const addGlows = () => {
    if (!map.getLayer(glows.id)) map.addLayer(glows, firstLabelLayerId(map.getStyle()));
  };
  map.on('style.load', addGlows);

  const listeners = new Set<(view: MapView) => void>();
  const emit = () => {
    const b = map.getBounds();
    const c = map.getCenter();
    const view: MapView = {
      zoom: map.getZoom(),
      bounds: { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
      center: { lat: c.lat, lng: c.lng },
    };
    for (const listener of listeners) listener(view);
  };
  map.on('load', emit);
  map.on('moveend', emit);

  // One frame clock: breathing glows ask MapLibre for a repaint inside Motion's render step.
  const tick = () => {
    if (glows.isAnimating()) map.triggerRepaint();
  };
  frame.render(tick, true);

  return {
    map,

    setGlowCells(cells, resolution) {
      glows.setCells(cells, resolution);
    },

    flyTo(center, zoom) {
      map.stop();
      const target = { center: [center.lng, center.lat] as [number, number], ...(zoom ? { zoom } : {}) };
      if (reducedMotion) {
        map.jumpTo(target);
        return;
      }
      map.flyTo({ ...target, duration: liquid.duration.long * 1000, easing: liquidEasing, essential: false });
    },

    setTheme(next) {
      if (next === theme) return;
      theme = next;
      glows.setTheme(next);
      map.setStyle(buildStyle(next), { diff: true });
      // A diffed style keeps custom layers out; put the glows back once it is applied.
      map.once('styledata', addGlows);
    },

    setReducedMotion(reduced) {
      reducedMotion = reduced;
      glows.setStill(reduced);
    },

    onViewChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy() {
      cancelFrame(tick);
      listeners.clear();
      map.remove();
    },
  };
}
