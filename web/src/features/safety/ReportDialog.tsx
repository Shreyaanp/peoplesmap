import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useReport } from '../../api/safety';
import type { PersonMini, ReportReason } from '../../api/types';
import { useToastActions } from '../../state/toast';
import { firstName } from '../../ui/format';
import styles from './ReportDialog.module.css';

const reasons: { value: ReportReason; label: string }[] = [
  { value: 'fake_profile', label: 'Fake profile, or pretending to be someone' },
  { value: 'harassment', label: 'Harassing or bullying me' },
  { value: 'spam', label: 'Spam or selling something' },
  { value: 'inappropriate_photo', label: 'Inappropriate photo' },
  { value: 'underage', label: 'Might be under 18' },
  { value: 'unsafe', label: 'Made me feel unsafe' },
  { value: 'other', label: 'Something else' },
];

interface ReportDialogProps {
  person: PersonMini;
  onClose: () => void;
  onBlocked: () => void;
}

/**
 * Why are you reporting them? A modal dialog (the platform's: focus stays inside, Escape closes),
 * a bottom sheet on phones and a card on desktop. Blocking them too is on by default.
 */
export default function ReportDialog({ person, onClose, onBlocked }: ReportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const report = useReport();
  const toast = useToastActions();
  const first = firstName(person.displayName);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reason) return;
    const trimmed = note.trim();
    report.mutate(
      {
        subject: { kind: 'person', id: person.id },
        reason,
        ...(trimmed ? { note: trimmed } : {}),
        alsoBlock,
      },
      {
        onSuccess: () => {
          ref.current?.close();
          if (alsoBlock) onBlocked();
          toast.show({
            text: alsoBlock
              ? `Thanks for telling us. ${first} is blocked.`
              : "Thanks for telling us. We'll take a look.",
          });
        },
      },
    );
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // A tap on the scrim (the dialog element itself, outside the form) closes it.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <form className={styles.form} onSubmit={submit}>
        <h2 id={titleId} className={styles.title}>
          Report {first}
        </h2>
        <p className={styles.lead}>{first} won't know it was you.</p>

        <fieldset className={styles.reasons}>
          <legend className={styles.legend}>What's wrong?</legend>
          {reasons.map((r) => (
            <label key={r.value} className={styles.reason}>
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className={styles.radio}
              />
              {r.label}
            </label>
          ))}
        </fieldset>

        <label className={styles.noteLabel}>
          Anything else we should know? <span className={styles.optional}>Optional</span>
          <textarea
            className={styles.note}
            value={note}
            maxLength={500}
            rows={2}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <label className={styles.block}>
          <input
            type="checkbox"
            checked={alsoBlock}
            onChange={(event) => setAlsoBlock(event.target.checked)}
            className={styles.checkbox}
          />
          <span>
            Also block {first}
            <span className={styles.hint}>You won't see each other anywhere on peoplemap.</span>
          </span>
        </label>

        {report.isError && (
          <p className={styles.error} role="alert">
            Couldn't send your report. Try again.
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button type="submit" className={styles.send} disabled={!reason || report.isPending}>
            {report.isPending ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
