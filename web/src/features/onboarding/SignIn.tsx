import { lazy, Suspense, useId, useState } from 'react';
import { useCityGlow, useSignIn } from '../../api/auth';
import { mocksEnabled } from '../../app/config';
import { MapPlaceholder } from '../../app/MapPlaceholder';
import { useAfterFirstPaint } from '../../app/useAfterFirstPaint';
import { Wordmark } from '../../ui/Wordmark';
import { GoogleButton } from './GoogleButton';
import styles from './Screen.module.css';

const CityBackdrop = lazy(() => import('./CityBackdrop'));
const DevSignIn = mocksEnabled ? lazy(() => import('./DevSignIn')) : null;

const peopleFormat = new Intl.NumberFormat('en-IN');

interface SignInProps {
  /** The session check failed for a reason other than "signed out" (server down, offline). */
  unreachable: boolean;
  onRetry: () => void;
}

/**
 * Onboarding step 1, "Arrive": the city's coarse amber glow and one button. Nobody sees people on
 * the map before signing in; the glow shows counts only.
 */
export default function SignIn({ unreachable, onRetry }: SignInProps) {
  const signIn = useSignIn();
  const glow = useCityGlow();
  const mapAllowed = useAfterFirstPaint();
  const [devOpen, setDevOpen] = useState(false);
  const devListId = useId();

  const people = glow.data?.cells.reduce((sum, cell) => sum + cell.count, 0);

  return (
    <main className={styles.screen}>
      {mapAllowed ? (
        <Suspense fallback={<MapPlaceholder />}>
          <CityBackdrop cells={glow.data?.cells} />
        </Suspense>
      ) : (
        <MapPlaceholder />
      )}

      <header className={styles.top}>
        <Wordmark />
      </header>

      <section className={styles.card} aria-labelledby="sign-in-title">
        <h1 id="sign-in-title" className={styles.title}>
          Find your people.
        </h1>
        <p className={styles.lede}>
          {people
            ? `${peopleFormat.format(people)} people in Hyderabad, glowing by what they're into.`
            : "People in Hyderabad, glowing by what they're into."}
        </p>

        {unreachable && (
          <div className={styles.alert} role="alert">
            <span>Can't reach peoplemap right now.</span>
            <button type="button" className={styles.link} onClick={onRetry}>
              Try again
            </button>
          </div>
        )}
        {signIn.isError && !unreachable && (
          <p className={styles.alert} role="alert">
            Couldn't sign you in. Try again.
          </p>
        )}

        <GoogleButton
          pending={signIn.isPending}
          onCredential={(credential) => signIn.mutate({ credential })}
        />

        {DevSignIn && (
          <div className={styles.dev}>
            <button
              type="button"
              className={styles.link}
              aria-expanded={devOpen}
              aria-controls={devListId}
              onClick={() => setDevOpen((open) => !open)}
            >
              Sign in as a test person
            </button>
            {devOpen && (
              <div id={devListId}>
                <Suspense fallback={null}>
                  <DevSignIn pending={signIn.isPending} onPick={(personId) => signIn.mutate({ personId })} />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {/* The map credit (required) sits under this card on phones, so it is repeated here. */}
        <p className={styles.credit}>
          Map © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Protomaps
        </p>
      </section>
    </main>
  );
}
