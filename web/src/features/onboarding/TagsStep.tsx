import { m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { liquid, spring, stagger, useReducedMotionPreference } from '../../motion';
import { hapticTick } from '../../motion/haptics';
import { levelLabel } from '../../ui/format';
import { CloseIcon } from '../../ui/icons/generated';
import { AddTag } from './AddTag';
import { cycleLevel, sentencePieces, type TagDraft } from './draft';
import screen from './Screen.module.css';
import { StepHeading } from './StepHeading';
import styles from './Steps.module.css';

interface TagsStepProps {
  sentence: string;
  tags: TagDraft[];
  onTagsChange: (tags: TagDraft[]) => void;
  /** True right after the sentence was read: the words lift off into chips once. */
  birth: boolean;
  onBorn: () => void;
  onDone: () => void;
}

/**
 * Onboarding step 3, Tag Birth. The sentence shows first with its tag words marked; a beat later
 * those words lift off and click into chips (a shared layout animation from word to chip), one
 * after another, each landing with a small amber pulse. Under reduce-motion the chips just fade in.
 */
export function TagsStep({ sentence, tags, onTagsChange, birth, onBorn, onDone }: TagsStepProps) {
  const reduced = useReducedMotionPreference();
  // Before lift-off the words sit in the sentence; after, they are chips.
  const [lifted, setLifted] = useState(!birth || reduced);
  const [landed, setLanded] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (lifted) return;
    const timer = setTimeout(() => setLifted(true), liquid.duration.short * 1000);
    return () => clearTimeout(timer);
  }, [lifted]);

  const land = (slug: string) => setLanded((previous) => new Set(previous).add(slug));

  // Safety net: a chip whose word was already where the chip goes has nothing to animate and never
  // reports landing. After the longest flight, everything counts as landed.
  useEffect(() => {
    if (!lifted || !birth) return;
    const timer = setTimeout(
      () => setLanded(new Set(tags.map((t) => t.slug))),
      (liquid.duration.long + tags.length * stagger.item) * 1000,
    );
    return () => clearTimeout(timer);
  }, [lifted, birth, tags]);

  // When the last born chip lands: one haptic tick, and Tag Birth is over (later visits to this
  // step show the chips directly). Under reduce-motion nothing flies, so it ends at once.
  const bornCount = tags.filter((t) => t.span).length;
  const done = useRef(false);
  useEffect(() => {
    if (!birth || done.current || !lifted) return;
    if (!reduced && landed.size < bornCount) return;
    done.current = true;
    if (!reduced) hapticTick();
    onBorn();
  }, [birth, lifted, reduced, landed, bornCount, onBorn]);

  const update = (slug: string, change: Partial<TagDraft>) =>
    onTagsChange(tags.map((t) => (t.slug === slug ? { ...t, ...change } : t)));
  const remove = (slug: string) => onTagsChange(tags.filter((t) => t.slug !== slug));
  const add = (tag: TagDraft) => {
    if (!tags.some((t) => t.slug === tag.slug)) onTagsChange([...tags, tag]);
  };

  const flying = birth && !reduced;
  let order = 0;

  return (
    <div className={styles.step}>
      <StepHeading>Your tags</StepHeading>

      <p className={styles.sentence} aria-label={`You wrote: ${sentence}`}>
        {sentencePieces(sentence, tags).map((piece, i) =>
          piece.slug && flying && !lifted ? (
            <m.span
              key={`${piece.slug}-${i}`}
              layoutId={`birth-${piece.slug}`}
              layout="position"
              className={styles.wordLive}
            >
              {piece.text}
            </m.span>
          ) : (
            <span key={`${piece.slug ?? 'text'}-${i}`} className={piece.slug ? styles.wordUsed : undefined}>
              {piece.text}
            </span>
          ),
        )}
      </p>

      <p className={screen.lede}>
        {tags.length > 0
          ? 'Tap a tag to set Learning, Doing or Teaching.'
          : 'No tags in that one. Add a few below.'}
      </p>

      {lifted && tags.length > 0 && (
        <ul className={styles.chips} aria-label="Your tags">
          {tags.map((tag) => {
            const delay = (tag.span ? order++ : 0) * stagger.item;
            return (
              <m.li
                key={tag.slug}
                className={styles.chip}
                data-landed={landed.has(tag.slug)}
                {...(flying && tag.span
                  ? { layoutId: `birth-${tag.slug}`, layout: 'position' as const }
                  : { layout: true })}
                transition={{ ...spring.crisp, delay: flying ? delay : 0 }}
                onLayoutAnimationComplete={() => land(tag.slug)}
              >
                <button
                  type="button"
                  className={styles.chipMain}
                  aria-label={`#${tag.display}, ${levelLabel[tag.level]}. Change level`}
                  onClick={() => update(tag.slug, { level: cycleLevel(tag.level) })}
                >
                  <span>#{tag.display}</span>
                  <span className={styles.chipLevel}>{levelLabel[tag.level]}</span>
                </button>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={`Remove #${tag.display}`}
                  onClick={() => remove(tag.slug)}
                >
                  <CloseIcon size="sm" />
                </button>
              </m.li>
            );
          })}
        </ul>
      )}

      <AddTag taken={tags} onAdd={add} />

      <button type="button" className={screen.primary} disabled={tags.length === 0} onClick={onDone}>
        Looks like me
      </button>
    </div>
  );
}
