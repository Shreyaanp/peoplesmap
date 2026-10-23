import { useEffect, useMemo, useRef, useState } from 'react';
import { useMe } from '../../api/me';
import { matchedSlugs, useSearch } from '../../api/search';
import type { LatLng } from '../../api/types';
import { useColorScheme } from '../../app/useColorScheme';
import { openPerson, useSearchQuery } from '../../app/urlState';
import { useReducedMotionPreference } from '../../motion';
import { createMapController, type MapController, type MapView as View } from './controller';
import styles from './MapView.module.css';
import { PinOverlay } from './PinOverlay';
import { useGlowTiles } from './useGlowTiles';
import { usePeopleTiles } from './usePeopleTiles';

const devParams = new URLSearchParams(window.location.search);

/** Area zoom: tag pins of the people around you, glows still breathing further out. */
const homeZoom = 13.6;
/** Where a search flies to (a named area, or the nearest group when results are thin): glows at full. */
const bloomZoom = 12.8;

/**
 * Opening camera: your own area, so the first thing you see is the people around you.
 * Without a location: the whole tech west and the old city, glowing.
 * Development: `?camera=zoom,lat,lng` opens any view directly (motion lab, screenshots).
 */
function initialCamera(home: LatLng | undefined) {
  const [zoom, lat, lng] = (devParams.get('camera') ?? '').split(',').map(Number);
  if (import.meta.env.DEV && zoom && lat && lng) return { center: { lat, lng }, zoom };
  if (home) return { center: home, zoom: homeZoom };
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
  const home = useMe().data?.location?.publicPoint;

  // Created once; theme and reduced motion are applied by the effects below, not by recreating the map.
  const initial = useRef({ theme, reducedMotion, home });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { home: start, ...look } = initial.current;
    const created = createMapController({ container, ...initialCamera(start), ...look });
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

  // Search: the same map, filtered to the matched tags. Glows cross-fade to the matches (related tags
  // ripple in a beat later, fainter), pins bloom in from the centre, and when the search names an area
  // or finds too few people nearby, the camera flies there first. Never a dead end.
  const query = useSearchQuery();
  const found = useSearch(query);
  const result = query ? found.data : undefined;
  const tags = useMemo(() => matchedSlugs(result), [result]);
  const flownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!query) flownFor.current = null;
    if (!query || !result || found.isPlaceholderData || !controller || flownFor.current === query) return;
    flownFor.current = query;
    const target = result.query.area?.center ?? result.nearest?.center;
    if (target) controller.flyTo(target, bloomZoom);
  }, [query, result, found.isPlaceholderData, controller]);

  const glows = useGlowTiles(view, tags);
  useEffect(() => {
    if (glows) controllerRef.current?.setGlowCells(glows.cells, glows.resolution);
  }, [glows]);

  // Pins keep the last complete set while new tiles load, so they never blink out mid-pan.
  const people = usePeopleTiles(view, tags);
  const [pins, setPins] = useState<NonNullable<typeof people>>([]);
  if (people && people !== pins) setPins(people);

  return (
    <>
      <div ref={containerRef} className={styles.map} role="region" aria-label="Map of people in Hyderabad" />
      {controller && (
        <PinOverlay
          map={controller.map}
          pins={pins}
          tagsShown={tagsShown}
          onSelect={openPerson}
          onZoomInto={controller.zoomInto}
          filterKey={tags.join(',')}
        />
      )}
    </>
  );
}
