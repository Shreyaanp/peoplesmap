import type { PersonCard } from '../../api/types';
import { Aura } from '../../ui/Aura';
import { formatActivity, formatDistance } from '../../ui/format';
import { TagChip } from '../../ui/TagChip';
import styles from './PersonRow.module.css';

interface PersonRowProps {
  person: PersonCard;
  onOpen: (id: string) => void;
}

/** One person in the results sheet. The whole row opens their profile. */
export function PersonRow({ person, onOpen }: PersonRowProps) {
  const meta = [person.locality, formatDistance(person.distance), formatActivity(person.activity)]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={styles.item}>
      <button
        type="button"
        className={styles.row}
        data-person-id={person.id}
        onClick={() => onOpen(person.id)}
      >
        <span className={styles.avatar} data-live={person.liveTag ? 'true' : undefined}>
          <Aura seed={person.id} />
        </span>
        <span className={styles.text}>
          <span className={styles.name}>{person.displayName}</span>
          <span className={styles.meta}>{meta}</span>
          <span className={styles.tags}>
            {person.topTags.map((tag) => (
              <TagChip key={tag.slug} display={tag.display} shared={tag.shared} />
            ))}
          </span>
        </span>
      </button>
    </li>
  );
}
