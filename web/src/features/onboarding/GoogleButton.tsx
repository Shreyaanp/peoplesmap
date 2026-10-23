import { useEffect, useRef, useState } from 'react';
import { googleClientId, mocksEnabled } from '../../app/config';
import { useColorScheme } from '../../app/useColorScheme';
import { loadGoogleIdentity, maxButtonWidth } from './googleIdentity';
import styles from './SignIn.module.css';

interface GoogleButtonProps {
  onCredential: (credential: string) => void;
  pending: boolean;
}

/**
 * "Continue with Google". With a client ID, Google's own button (its branding rules require it).
 * Without one, the mock API accepts a stand-in so sign-in works before the OAuth client exists.
 */
export function GoogleButton({ onCredential, pending }: GoogleButtonProps) {
  if (googleClientId) return <RealGoogleButton clientId={googleClientId} onCredential={onCredential} />;
  if (mocksEnabled) {
    return (
      <button
        type="button"
        className={styles.primary}
        aria-busy={pending}
        disabled={pending}
        onClick={() => onCredential('mock-google-credential')}
      >
        {pending ? 'Signing in…' : 'Continue with Google'}
      </button>
    );
  }
  return (
    <p className={styles.notice} role="status">
      Google sign-in isn't set up yet.
    </p>
  );
}

function RealGoogleButton({
  clientId,
  onCredential,
}: {
  clientId: string;
  onCredential: (c: string) => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const theme = useColorScheme();
  const [failed, setFailed] = useState(false);
  // Google calls back long after render; always reach the latest handler.
  const callback = useRef(onCredential);
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity().then(
      (id) => {
        const parent = slot.current;
        if (cancelled || !parent) return;
        id.initialize({ client_id: clientId, callback: ({ credential }) => callback.current(credential) });
        parent.replaceChildren();
        id.renderButton(parent, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: Math.min(parent.clientWidth || maxButtonWidth, maxButtonWidth),
        });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [clientId, theme]);

  if (failed) {
    return (
      <p className={styles.notice} role="alert">
        Couldn't load Google sign-in. Check your connection and reload.
      </p>
    );
  }
  return <div ref={slot} className={styles.googleSlot} />;
}
