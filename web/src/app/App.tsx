import { SearchBar } from '../ui/SearchBar';
import { Wordmark } from '../ui/Wordmark';
import styles from './App.module.css';

/** Placeholder home: a living amber glow on the warm grey world, with the search bar on top. */
export function App() {
  return (
    <div className={styles.shell}>
      <div className={styles.map} aria-hidden="true">
        <div className={styles.glow} data-testid="glow" />
      </div>
      <header className={styles.chrome}>
        <Wordmark />
        <SearchBar />
      </header>
      <main className={styles.prompt}>
        <h1 className={styles.headline}>Find your people.</h1>
      </main>
    </div>
  );
}
