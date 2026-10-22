import styles from './Wordmark.module.css';

/** Lowercase "peoplemap" with an amber glow dot as the "o" in "people". */
export function Wordmark() {
  return (
    <span className={styles.wordmark} role="img" aria-label="peoplemap">
      <span aria-hidden="true">pe</span>
      <span className={styles.dot} aria-hidden="true" />
      <span aria-hidden="true">plemap</span>
    </span>
  );
}
