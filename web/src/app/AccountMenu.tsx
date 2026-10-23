import { useId } from 'react';
import { useSignOut } from '../api/auth';
import { useMe } from '../api/me';
import { Aura } from '../ui/Aura';
import styles from './AccountMenu.module.css';

/**
 * Your aura, top right, like the account avatar in Google Maps. Opens a small panel (a native
 * popover: Escape and tapping outside close it) with who you are and Sign out.
 */
export default function AccountMenu() {
  const me = useMe();
  const signOut = useSignOut();
  const panelId = useId();
  if (!me.data) return null;
  const { id, displayName, email } = me.data;

  return (
    <>
      <button type="button" className={styles.trigger} popoverTarget={panelId} aria-label="Your account">
        <Aura seed={id} className={styles.aura} />
      </button>
      <div id={panelId} popover="auto" className={styles.panel}>
        <p className={styles.name}>{displayName ?? 'You'}</p>
        <p className={styles.email}>{email}</p>
        {signOut.isError && (
          <p className={styles.email} role="alert">
            Couldn't sign out. Try again.
          </p>
        )}
        <button
          type="button"
          className={styles.action}
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          Sign out
        </button>
      </div>
    </>
  );
}
