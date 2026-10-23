import { devLoginChoices } from '@mocks';
import { Aura } from '../../ui/Aura';
import styles from './SignIn.module.css';

/**
 * Development only: sign in as any seeded person (POST /auth/dev), one per area, so every corner of
 * the mock city can be tried. Lazy-loaded, and only when the mock API is on.
 */
export default function DevSignIn({ onPick, pending }: { onPick: (id: string) => void; pending: boolean }) {
  return (
    <ul className={styles.devList} aria-label="Test people">
      {devLoginChoices().map((person) => (
        <li key={person.id} className={styles.devItem}>
          <button
            type="button"
            className={styles.devRow}
            disabled={pending}
            onClick={() => onPick(person.id)}
          >
            <Aura seed={person.id} className={styles.devAvatar} />
            <span className={styles.devName}>{person.displayName}</span>
            <span className={styles.devArea}>{person.locality}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
