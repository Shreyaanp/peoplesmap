import { useId } from 'react';
import { useExtractTags } from '../../api/onboarding';
import type { ExtractedTag } from '../../api/types';
import screen from './Screen.module.css';
import { StepHeading } from './StepHeading';
import styles from './Steps.module.css';

const maxLength = 280;

interface DescribeStepProps {
  sentence: string;
  onChange: (sentence: string) => void;
  onTags: (tags: ExtractedTag[]) => void;
}

/** Onboarding step 2: one sentence about yourself. The tags come from it. */
export function DescribeStep({ sentence, onChange, onTags }: DescribeStepProps) {
  const extract = useExtractTags();
  const hintId = useId();
  const ready = sentence.trim().length >= 3 && !extract.isPending;

  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) extract.mutate(sentence.trim(), { onSuccess: onTags });
      }}
    >
      <StepHeading>Describe yourself</StepHeading>
      <p className={screen.lede} id={hintId}>
        One sentence: what you're into, what you're learning, what you could teach.
      </p>
      <div className={styles.field}>
        <textarea
          className={styles.textarea}
          aria-label="Describe yourself"
          aria-describedby={hintId}
          rows={3}
          maxLength={maxLength}
          placeholder="I play badminton most evenings, I'm learning photography and I can teach React."
          value={sentence}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={styles.counter} aria-hidden="true">
          {sentence.length}/{maxLength}
        </span>
      </div>
      {extract.isError && (
        <p className={screen.alert} role="alert">
          Couldn't read that just now. Try again.
        </p>
      )}
      <button type="submit" className={screen.primary} disabled={!ready} aria-busy={extract.isPending}>
        {extract.isPending ? 'Finding your tags…' : 'Make my tags'}
      </button>
    </form>
  );
}
