import { useEffect, useRef, useState } from 'react';
import { useColorScheme } from '../../app/useColorScheme';
import { useReducedMotionPreference } from '../../motion';
import { createMapController, type MapController, type MapView as View } from './controller';
import styles from './MapView.module.css';
import { useGlowTiles } from './useGlowTiles';

/** Opening camera: the whole tech west and the old city, glowing. */
const initialCamera = { center: { lat: 17.425, lng: 78.42 }, zoom: 11.2 };

/** The live map. Lazy-loaded: MapLibre stays out of the first-paint bundle. */
export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<MapController | null>(null);
  const [view, setView] = useState<View | null>(null);
  const theme = useColorScheme();
  const reducedMotion = useReducedMotionPreference();

  // Created once; theme and reduced motion are applied by the effects below, not by recreating the map.
  const initial = useRef({ theme, reducedMotion });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const controller = createMapController({ container, ...initialCamera, ...initial.current });
    controllerRef.current = controller;
    const unsubscribe = controller.onViewChange(setView);
    return () => {
      unsubscribe();
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => controllerRef.current?.setTheme(theme), [theme]);
  useEffect(() => controllerRef.current?.setReducedMotion(reducedMotion), [reducedMotion]);

  const glows = useGlowTiles(view, []);
  useEffect(() => {
    if (glows) controllerRef.current?.setGlowCells(glows.cells, glows.resolution);
  }, [glows]);

  return (
    <div ref={containerRef} className={styles.map} role="region" aria-label="Map of people in Hyderabad" />
  );
}
