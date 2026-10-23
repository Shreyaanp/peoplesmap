import type { TagLevel } from '../api/types';
import { levelLabel } from './format';
import styles from './TagChip.module.css';

interface TagChipProps {
  display: string;
  /** A tag the viewer has too: it glows amber. */
  shared?: boolean;
  level?: TagLevel;
}

/** One interest. Shared tags glow; the level shows only where it helps (profiles). */
export function TagChip({ display, shared = false, level }: TagChipProps) {
  return (
    <span className={styles.chip} data-shared={shared}>
      #{display}
      {level && <span className={styles.level}>{levelLabel[level]}</span>}
      {shared && <span className="visuallyHidden">, you share this</span>}
    </span>
  );
}
