import styles from './MapPlaceholder.module.css';

/** Until MapLibre arrives: the warm grey world with one breathing glow, so first paint is never empty. */
export function MapPlaceholder() {
  return (
    <div className={styles.map} aria-hidden="true">
      <div className={styles.glow} data-testid="glow" />
    </div>
  );
}
