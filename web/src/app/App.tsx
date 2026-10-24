import { lazy, Suspense, useState } from 'react';
import { useMe } from '../api/me';
import { useTagSuggestions } from '../api/tags';
import { AppProviders } from '../state/AppProviders';
import { SearchField } from '../ui/SearchField';
import { tagPrefix, useSearchText, type SearchHandoff } from '../ui/searchShared';
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
// Tag suggestions need React Aria's combobox; the plain field paints first and hands over to it.
const SearchBar = lazy(() => import('../ui/SearchBar'));

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
        <Search full={mapAllowed} />
      </header>
      {mapAllowed && (
        <Suspense fallback={null}>
          <PeopleSheet />
        </Suspense>
      )}
    </div>
  );
}

/** The search bar: the plain field first, then the full bar with tag suggestions once allowed. */
function Search({ full }: { full: boolean }) {
  const query = useSearchQuery();
  const [text, setText] = useSearchText(query);
  const [handoff] = useState<SearchHandoff>(() => ({ focused: false, caret: null }));
  const suggestions = useTagSuggestions(full ? tagPrefix(text) : '');
  const field = { query, text, onTextChange: setText, onSubmit: search, onClear: clearSearch, handoff };
  const plain = <SearchField {...field} />;
  if (!full) return plain;
  return (
    <Suspense fallback={plain}>
      <SearchBar {...field} suggestions={suggestions.data ?? []} />
    </Suspense>
  );
}
