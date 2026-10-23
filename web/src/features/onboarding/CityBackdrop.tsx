import { useEffect, useRef } from 'react';
import type { GlowCell } from '../../api/types';
import { useColorScheme } from '../../app/useColorScheme';
import { useReducedMotionPreference } from '../../motion';
import { createMapController, type MapController } from '../map/controller';
import styles from '../map/MapView.module.css';

/**
 * The living city behind the sign-in screen: Hyderabad's coarse amber glow, counts only.
 * Not interactive; the camera sits a little south so the city shows above the sign-in card.
 */
export default function CityBackdrop({ cells }: { cells: readonly GlowCell[] | undefined }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<MapController | null>(null);
  const theme = useColorScheme();
  const reducedMotion = useReducedMotionPreference();

  const initial = useRef({ theme, reducedMotion });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const created = createMapController({
      container,
      center: { lat: 17.33, lng: 78.43 },
      zoom: 10.2,
      interactive: false,
      ...initial.current,
    });
    controllerRef.current = created;
    return () => {
      created.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => controllerRef.current?.setTheme(theme), [theme]);
  useEffect(() => controllerRef.current?.setReducedMotion(reducedMotion), [reducedMotion]);
  useEffect(() => {
    if (cells) controllerRef.current?.setGlowCells(cells, 6);
  }, [cells]);

  return <div ref={containerRef} className={styles.map} aria-hidden="true" />;
}
