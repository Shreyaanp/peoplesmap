import { useDiscover, useMe, usePrefetchProfile } from '../../api/queries';
import { openPerson } from '../../app/urlState';
import styles from './Discover.module.css';
import { PersonRow } from './PersonRow';
import { warm } from './warm';

/** The sheet's default peek, before any search: people around you with different interests. */
export function DiscoverHeader() {
  const me = useMe();
  const locality = me.data?.location?.locality;
  return (
    <header className={styles.header}>
      <h2 className={styles.title}>Around you</h2>
      <p className={styles.subtitle}>{locality ? `${locality} · ` : ''}people into different things</p>
    </header>
  );
}

export function DiscoverList() {
  const discover = useDiscover();
  const prefetch = usePrefetchProfile();

  if (discover.isPending) {
    return (
      <ul className={styles.list} aria-busy="true" aria-label="Loading people around you">
        {[0, 1, 2].map((i) => (
          <li key={i} className={styles.placeholder} />
        ))}
      </ul>
    );
  }

  if (discover.isError) {
    return (
      <div className={styles.problem} role="alert">
        <p>Couldn't load people around you.</p>
        <button type="button" className={styles.retry} onClick={() => void discover.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <ul className={styles.list} onPointerDownCapture={(e) => warm(e.target, prefetch)}>
      {discover.data.items.map((person) => (
        <PersonRow key={person.id} person={person} onOpen={openPerson} />
      ))}
    </ul>
  );
}
