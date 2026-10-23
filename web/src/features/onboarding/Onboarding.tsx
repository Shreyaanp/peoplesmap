import { AnimatePresence, domMax, LazyMotion, m } from 'motion/react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { useCityGlow } from '../../api/auth';
import type { Me, MyLocation } from '../../api/types';
import { MapPlaceholder } from '../../app/MapPlaceholder';
import { useAfterFirstPaint } from '../../app/useAfterFirstPaint';
import { spring, useMotionTransition, useReducedMotionPreference } from '../../motion';
import { BackIcon } from '../../ui/icons/generated';
import { Wordmark } from '../../ui/Wordmark';
import { DescribeStep } from './DescribeStep';
import { fromExtracted, type TagDraft } from './draft';
import screen from './Screen.module.css';
import styles from './Steps.module.css';
import { TagsStep } from './TagsStep';
import { YouStep } from './YouStep';

const CityBackdrop = lazy(() => import('./CityBackdrop'));

const steps = ['describe', 'tags', 'you'] as const;
type Step = (typeof steps)[number];

/** How far a step slides in or out, in px (times the motion scale). */
const slide = 24;

/**
 * Onboarding after sign-in, over the same glowing city: describe yourself → Tag Birth → name and
 * location → on the map. Steps slide like pages (back slides the other way). The draft lives here
 * until the last step saves it; saving flips `me.status` to active and the app shows the map.
 */
export default function Onboarding({ me }: { me: Me }) {
  const mapAllowed = useAfterFirstPaint();
  const glow = useCityGlow();
  const reduced = useReducedMotionPreference();
  const transition = useMotionTransition(spring.crisp);

  const [step, setStep] = useState<Step>('describe');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [sentence, setSentence] = useState(me.sentence ?? '');
  const [tags, setTags] = useState<TagDraft[]>([]);
  const [birth, setBirth] = useState(false);
  const [name, setName] = useState(me.displayName ?? '');
  const [location, setLocation] = useState<MyLocation | null>(me.location);

  const go = (next: Step) => {
    setDirection(steps.indexOf(next) > steps.indexOf(step) ? 1 : -1);
    setStep(next);
  };
  const onBorn = useCallback(() => setBirth(false), []);

  const index = steps.indexOf(step);
  const offset = reduced ? 0 : slide;

  return (
    <main className={screen.screen}>
      {mapAllowed ? (
        <Suspense fallback={<MapPlaceholder />}>
          <CityBackdrop cells={glow.data?.cells} />
        </Suspense>
      ) : (
        <MapPlaceholder />
      )}

      <header className={screen.top}>
        <Wordmark />
      </header>

      <LazyMotion features={domMax} strict>
        <section className={`${screen.card} ${styles.card}`} aria-label="Create your profile">
          <div className={styles.progress}>
            {index > 0 ? (
              <button
                type="button"
                className={styles.back}
                aria-label="Back"
                onClick={() => go(steps[index - 1] ?? 'describe')}
              >
                <BackIcon />
              </button>
            ) : (
              <span className={styles.backSpacer} />
            )}
            <ol className={styles.dots} aria-label={`Step ${index + 1} of ${steps.length}`}>
              {steps.map((s, i) => (
                <li key={s} className={styles.dot} data-done={i <= index} aria-hidden="true" />
              ))}
            </ol>
          </div>

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <m.div
              key={step}
              custom={direction}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * offset }),
                center: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: -d * offset }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
            >
              {step === 'describe' && (
                <DescribeStep
                  sentence={sentence}
                  onChange={setSentence}
                  onTags={(extracted) => {
                    setTags(fromExtracted(extracted));
                    setBirth(true);
                    go('tags');
                  }}
                />
              )}
              {step === 'tags' && (
                <TagsStep
                  sentence={sentence}
                  tags={tags}
                  onTagsChange={setTags}
                  birth={birth}
                  onBorn={onBorn}
                  onDone={() => go('you')}
                />
              )}
              {step === 'you' && (
                <YouStep
                  id={me.id}
                  name={name}
                  onNameChange={setName}
                  location={location}
                  onLocation={setLocation}
                  sentence={sentence}
                  tags={tags}
                />
              )}
            </m.div>
          </AnimatePresence>
        </section>
      </LazyMotion>
    </main>
  );
}
