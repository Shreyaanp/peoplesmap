import { auraVars } from './auraVars';
import styles from './Aura.module.css';

interface AuraProps {
  /** The person's id: the same person always gets the same aura. */
  seed: string;
  className?: string | undefined;
}

/** The generated avatar shown when someone has no photo. Decorative: the name is announced elsewhere. */
export function Aura({ seed, className }: AuraProps) {
  return (
    <span
      className={className ? `${styles.aura} ${className}` : styles.aura}
      style={auraVars(seed)}
      aria-hidden="true"
    />
  );
}
