import { lazy, Suspense } from 'react';
import { AppProviders } from '../state/AppProviders';
import { SearchBar } from '../ui/SearchBar';
import { Wordmark } from '../ui/Wordmark';
import styles from './App.module.css';

const MapView = lazy(() => import('../features/map/MapView'));
const PeopleSheet = lazy(() => import('../features/sheet/PeopleSheet'));

/** Until MapLibre arrives: the warm grey world with one breathing glow, so first paint is never empty. */
function MapPlaceholder() {
  return (
    <div className={styles.map} aria-hidden="true">
      <div className={styles.glow} data-testid="glow" />
    </div>
  );
}

export function App() {
  return (
    <AppProviders>
      <div className={styles.shell}>
        <Suspense fallback={<MapPlaceholder />}>
          <MapView />
        </Suspense>
        <header className={styles.chrome}>
          <Wordmark />
          <SearchBar />
        </header>
        <Suspense fallback={null}>
          <PeopleSheet />
        </Suspense>
      </div>
    </AppProviders>
  );
}
