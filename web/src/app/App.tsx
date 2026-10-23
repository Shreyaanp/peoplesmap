import { lazy, Suspense } from 'react';
import { useMe } from '../api/me';
import { AppProviders } from '../state/AppProviders';
import { SearchBar } from '../ui/SearchBar';
import { Wordmark } from '../ui/Wordmark';
import styles from './App.module.css';
import { MapPlaceholder } from './MapPlaceholder';
import { clearSearch, search, useSearchQuery } from './urlState';
import { useAfterFirstPaint } from './useAfterFirstPaint';

const MapView = lazy(() => import('../features/map/MapView'));
const PeopleSheet = lazy(() => import('../features/sheet/PeopleSheet'));
const SignIn = lazy(() => import('../features/onboarding/SignIn'));
const Onboarding = lazy(() => import('../features/onboarding/Onboarding'));
// Sign-out needs TanStack's mutation code; keep it out of the first-paint bundle.
const AccountMenu = lazy(() => import('./AccountMenu'));

export function App() {
  return (
    <AppProviders>
      <Session />
    </AppProviders>
  );
}

/** Sign in, then create a profile, before the map: nobody sees people until they are on it too. */
function Session() {
  const me = useMe();
  if (me.isPending) return <MapPlaceholder />;
  if (me.data?.status === 'onboarding') {
    return (
      <Suspense fallback={<MapPlaceholder />}>
        <Onboarding me={me.data} />
      </Suspense>
    );
  }
  if (me.data) return <SignedIn />;
  return (
    <Suspense fallback={<MapPlaceholder />}>
      <SignIn unreachable={me.isError} onRetry={() => void me.refetch()} />
    </Suspense>
  );
}

function SignedIn() {
  // The shell (wordmark, search) paints and responds first; MapLibre's large script waits for idle.
  const mapAllowed = useAfterFirstPaint();
  const query = useSearchQuery();
  return (
    <div className={styles.shell}>
      {mapAllowed ? (
        <Suspense fallback={<MapPlaceholder />}>
          <MapView />
        </Suspense>
      ) : (
        <MapPlaceholder />
      )}
      <header className={styles.chrome}>
        <div className={styles.brandRow}>
          <Wordmark />
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        </div>
        <SearchBar query={query} onSubmit={search} onClear={clearSearch} />
      </header>
      {mapAllowed && (
        <Suspense fallback={null}>
          <PeopleSheet />
        </Suspense>
      )}
    </div>
  );
}
