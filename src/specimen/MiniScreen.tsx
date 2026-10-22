import type { IconWeight } from '../ui/icons/Icon';
import {
  ChatIcon,
  CloseIcon,
  ConnectIcon,
  FilterIcon,
  InboxIcon,
  LiveIcon,
  LocateIcon,
  MoreIcon,
  PinIcon,
  SearchIcon,
  SparkleIcon,
} from '../ui/icons/generated';
import styles from './Specimen.module.css';
import { fontStyle, type Typeface } from './typefaces';

const chips = [
  { tag: '#badminton', level: 'Doing', shared: true },
  { tag: '#trekking', level: 'Learning', shared: false },
  { tag: '#chess', level: 'Teaching', shared: false },
] as const;

interface MiniScreenProps {
  typeface: Typeface;
  weight: IconWeight;
}

/** The same small slice of peoplemap, so typefaces and icon weights are judged on real UI. */
export function MiniScreen({ typeface, weight }: MiniScreenProps) {
  return (
    <div className={styles.screen} style={fontStyle(typeface)}>
      <div className={styles.search}>
        <SearchIcon weight={weight} />
        <input
          className={styles.searchInput}
          defaultValue="#badminton"
          aria-label="Search people by interest"
        />
        <button type="button" className={styles.iconButton} aria-label="Clear search">
          <CloseIcon weight={weight} size="sm" />
        </button>
      </div>

      <ul className={styles.dropdown} aria-label="Suggestions">
        <li className={styles.suggestion}>
          <PinIcon weight={weight} size="sm" />
          <span>
            <strong className={styles.tag}>#badminton</strong>
            <span className={styles.muted}> · 340 near Gachibowli</span>
          </span>
        </li>
        <li className={styles.suggestion}>
          <SparkleIcon weight={weight} size="sm" />
          <span>
            <strong className={styles.tag}>#badminton-doubles</strong>
            <span className={styles.muted}> · 52 near Gachibowli</span>
          </span>
        </li>
      </ul>

      <section className={styles.card} aria-label="Profile">
        <div className={styles.cardHeader}>
          <div className={styles.avatar} aria-hidden="true">
            AR
          </div>
          <div className={styles.identity}>
            <h3 className={styles.name}>Aarav Reddy</h3>
            <p className={styles.area}>
              <PinIcon weight={weight} size="sm" />
              Madhapur
            </p>
            <p className={styles.live}>
              <span className={styles.liveDot} aria-hidden="true" />
              <LiveIcon weight={weight} size="sm" />
              #badminton tonight · 2h left
            </p>
          </div>
        </div>

        <ul className={styles.chips} aria-label="Interests">
          {chips.map((c) => (
            <li key={c.tag} className={styles.chip} data-shared={c.shared || undefined}>
              <span className={styles.tag}>{c.tag}</span>
              <span className={styles.level}>{c.level}</span>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button type="button" className={styles.primary}>
            <ConnectIcon weight={weight} size="sm" />
            Connect
          </button>
          <button type="button" className={styles.secondary}>
            <ChatIcon weight={weight} size="sm" />
            Chat
          </button>
        </div>
      </section>

      <div className={styles.iconRow} aria-label="Icons">
        <LocateIcon weight={weight} />
        <InboxIcon weight={weight} className={styles.active} />
        <ChatIcon weight={weight} />
        <FilterIcon weight={weight} />
        <MoreIcon weight={weight} />
      </div>
    </div>
  );
}
