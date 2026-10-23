import { usePrefetchProfile } from '../../api/queries';
import { useSearch } from '../../api/search';
import type { SearchResult } from '../../api/types';
import { openPerson, search, useSearchQuery } from '../../app/urlState';
import styles from './Discover.module.css';
import { PersonRow } from './PersonRow';
import results from './Results.module.css';
import { warm } from './warm';

/** How many related tags to offer as a next search. */
const relatedShown = 3;

function title(query: string, result: SearchResult | undefined): string {
  const tags = result?.query.tags ?? [];
  return tags.length > 0 ? tags.map((tag) => `#${tag.display}`).join(' · ') : query;
}

/** "12 people · near Gachibowli · this weekend", or why the list shows somewhere else. */
function summary(result: SearchResult): string {
  const { query, items, nextCursor, nearest } = result;
  if (query.tags.length === 0) return "Couldn't match that to an interest. Try a hashtag like #badminton.";
  if (items.length === 0) return 'Nobody with that interest yet.';
  const count = `${items.length}${nextCursor ? '+' : ''} ${items.length === 1 && !nextCursor ? 'person' : 'people'}`;
  if (nearest) return `Few near you, so here's ${nearest.locality}: ${nearest.count} there`;
  const level = query.level === 'teaching' ? 'who teach' : query.level === 'learning' ? 'learning too' : null;
  return [count, level, query.area && `near ${query.area.name}`, query.timeWindow?.label]
    .filter(Boolean)
    .join(' · ');
}

/** The sheet's header during a search: what was understood, and how many people match. */
export function ResultsHeader() {
  const query = useSearchQuery() ?? '';
  const found = useSearch(query);
  const result = found.isPlaceholderData ? undefined : found.data;
  const related = result?.query.related.slice(0, relatedShown) ?? [];

  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title(query, result)}</h2>
      <p className={styles.subtitle} role="status">
        {result ? summary(result) : found.isError ? '' : 'Looking…'}
      </p>
      {related.length > 0 && (
        <div className={results.related}>
          <span className={results.relatedLabel}>Also try</span>
          {related.map((tag) => (
            <button
              key={tag.slug}
              type="button"
              className={results.relatedTag}
              onClick={() => search(`#${tag.display}`)}
            >
              #{tag.display}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

export function ResultsList() {
  const query = useSearchQuery() ?? '';
  const found = useSearch(query);
  const prefetch = usePrefetchProfile();

  if (found.isError) {
    return (
      <div className={styles.problem} role="alert">
        <p>Couldn't search just now.</p>
        <button type="button" className={styles.retry} onClick={() => void found.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (!found.data || found.isPlaceholderData) {
    return (
      <ul className={styles.list} aria-busy="true" aria-label="Loading results">
        {[0, 1, 2].map((i) => (
          <li key={i} className={styles.placeholder} />
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={styles.list}
      aria-label="People matching your search"
      onPointerDownCapture={(e) => warm(e.target, prefetch)}
    >
      {found.data.items.map((person) => (
        <PersonRow key={person.id} person={person} onOpen={openPerson} />
      ))}
    </ul>
  );
}
