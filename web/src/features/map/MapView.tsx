import { useEffect, useRef, useState } from 'react';
import { useColorScheme } from '../../app/useColorScheme';
import { useReducedMotionPreference } from '../../motion';
import { createMapController, type MapController, type MapView as View } from './controller';
import styles from './MapView.module.css';
import { PinOverlay } from './PinOverlay';
import { useGlowTiles } from './useGlowTiles';
import { usePeopleTiles } from './usePeopleTiles';

const devParams = new URLSearchParams(window.location.search);

/**
 * Opening camera: the whole tech west and the old city, glowing.
 * Development: `?camera=zoom,lat,lng` opens any view directly (motion lab, screenshots).
 */
function initialCamera() {
  const [zoom, lat, lng] = (devParams.get('camera') ?? '').split(',').map(Number);
  if (import.meta.env.DEV && zoom && lat && lng) return { center: { lat, lng }, zoom };
  return { center: { lat: 17.425, lng: 78.42 }, zoom: 11.2 };
}

/** Motion-lab switch: `?pinTags=3` shows three tags per pin instead of one. */
const tagsShown: 1 | 3 = devParams.get('pinTags') === '3' ? 3 : 1;

/** The live map. Lazy-loaded: MapLibre stays out of the first-paint bundle. */
export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<MapController | null>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const [view, setView] = useState<View | null>(null);
  const theme = useColorScheme();
  const reducedMotion = useReducedMotionPreference();

  // Created once; theme and reduced motion are applied by the effects below, not by recreating the map.
  const initial = useRef({ theme, reducedMotion });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const created = createMapController({ container, ...initialCamera(), ...initial.current });
    controllerRef.current = created;
    const unsubscribe = created.onViewChange((next) => {
      setController(created);
      setView(next);
    });
    return () => {
      unsubscribe();
      created.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => controllerRef.current?.setTheme(theme), [theme]);
  useEffect(() => controllerRef.current?.setReducedMotion(reducedMotion), [reducedMotion]);

  const glows = useGlowTiles(view, []);
  useEffect(() => {
    if (glows) controllerRef.current?.setGlowCells(glows.cells, glows.resolution);
  }, [glows]);

  // Pins keep the last complete set while new tiles load, so they never blink out mid-pan.
  const people = usePeopleTiles(view, []);
  const [pins, setPins] = useState<NonNullable<typeof people>>([]);
  if (people && people !== pins) setPins(people);

  return (
    <>
      <div ref={containerRef} className={styles.map} role="region" aria-label="Map of people in Hyderabad" />
      {controller && <PinOverlay map={controller.map} pins={pins} tagsShown={tagsShown} />}
    </>
  );
}
