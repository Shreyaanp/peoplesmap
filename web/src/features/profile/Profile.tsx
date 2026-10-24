import { useConnect, useProfile } from '../../api/queries';
import { closePerson, openDraft, openThread } from '../../app/urlState';
import { hapticTick } from '../../motion/haptics';
import { Aura } from '../../ui/Aura';
import { formatActivity, formatDistance, formatTimeLeft } from '../../ui/format';
import { TagChip } from '../../ui/TagChip';
import styles from './Profile.module.css';

/** The sheet header while a profile is open: back to the map. The name is the card's heading. */
export function ProfileHeader() {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={closePerson} aria-label="Back to the map">
        <span aria-hidden="true">←</span>
      </button>
    </header>
  );
}

/** The profile card: photo-first, shared tags glowing, Connect as the one main action. */
export function ProfileBody({ id }: { id: string }) {
  const profile = useProfile(id);
  const connect = useConnect(id);

  if (profile.isPending)
    return <div className={styles.loading} aria-busy="true" aria-label="Loading profile" />;
  if (profile.isError) {
    return (
      <div className={styles.problem} role="alert">
        <p>This profile isn't available.</p>
        <button type="button" className={styles.secondary} onClick={closePerson}>
          Back to the map
        </button>
      </div>
    );
  }

  const person = profile.data;
  const connected = person.connection.iConnect;
  const live = person.liveTags[0];
  const meta = [person.locality, formatDistance(person.distance), formatActivity(person.activity)]
    .filter(Boolean)
    .join(' · ');
  const shared = person.tags.filter((t) => t.shared);
  const others = person.tags.filter((t) => !t.shared);

  return (
    <article className={styles.card}>
      <div className={styles.hero}>
        <span className={styles.avatar}>
          <Aura seed={person.id} />
        </span>
        <div className={styles.identity}>
          <h2 className={styles.name}>{person.displayName}</h2>
          <p className={styles.meta}>{meta}</p>
          {live && (
            <p className={styles.live}>
              <span className={styles.liveDot} aria-hidden="true" />#{live.display} now ·{' '}
              {formatTimeLeft(live.expiresAt)}
            </p>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          aria-pressed={connected}
          onClick={() => {
            if (!connected) hapticTick();
            connect.mutate(!connected);
          }}
        >
          {connected ? 'Connected' : 'Connect'}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => (person.threadId ? openThread(person.threadId) : openDraft(person.id))}
        >
          Chat
        </button>
      </div>

      {person.sentence && <p className={styles.sentence}>{person.sentence}</p>}

      {shared.length > 0 && (
        <section className={styles.section} aria-label="Interests you share">
          <h3 className={styles.sectionTitle}>You both like</h3>
          <div className={styles.tags}>
            {shared.map((tag) => (
              <TagChip key={tag.slug} display={tag.display} level={tag.level} shared />
            ))}
          </div>
        </section>
      )}

      <section className={styles.section} aria-label="Interests">
        <h3 className={styles.sectionTitle}>{shared.length > 0 ? 'Also into' : 'Into'}</h3>
        <div className={styles.tags}>
          {others.map((tag) => (
            <TagChip key={tag.slug} display={tag.display} level={tag.level} />
          ))}
        </div>
      </section>
    </article>
  );
}
