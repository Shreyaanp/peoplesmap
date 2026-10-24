import { lazy, Suspense, useId, useRef, useState } from 'react';
import { useBlock } from '../../api/safety';
import type { PersonMini } from '../../api/types';
import { useToastActions } from '../../state/toast';
import { firstName } from '../../ui/format';
import { BlockIcon, MoreIcon, ReportIcon } from '../../ui/icons/generated';
import styles from './SafetyMenu.module.css';

// Most people never report anyone: the dialog loads on the first Report tap.
const ReportDialog = lazy(() => import('./ReportDialog'));

interface SafetyMenuProps {
  person: PersonMini;
  /** Called once they are blocked: the profile or conversation showing them should close. */
  onBlocked: () => void;
}

/**
 * "More" (···) on a profile or conversation: Report and Block, out of the way but always one tap
 * from wherever someone is. Blocking happens at once with Undo instead of a confirm dialog;
 * reporting asks why first.
 */
export function SafetyMenu({ person, onBlocked }: SafetyMenuProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [reporting, setReporting] = useState(false);
  const block = useBlock();
  const toast = useToastActions();
  const first = firstName(person.displayName);

  // Pin the menu under the trigger. Measured on the tap that opens it, never during an animation.
  const place = () => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    panel.style.setProperty('--menu-top', `${trigger.bottom + 4}px`);
    panel.style.setProperty('--menu-right', `${window.innerWidth - trigger.right}px`);
  };

  const choose = (action: () => void) => {
    panelRef.current?.hidePopover();
    action();
  };

  const blockNow = () => {
    block.mutate(
      { personId: person.id, blocked: true },
      {
        onSuccess: () => {
          onBlocked();
          toast.show({
            text: `Blocked ${first}. They won't be told.`,
            action: { label: 'Undo', run: () => block.mutate({ personId: person.id, blocked: false }) },
          });
        },
        onError: () => toast.show({ text: `Couldn't block ${first}. Try again.` }),
      },
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        popoverTarget={panelId}
        onClick={place}
        aria-label={`More options for ${person.displayName}`}
      >
        <MoreIcon size="md" />
      </button>
      <div ref={panelRef} id={panelId} popover="auto" className={styles.panel}>
        <button type="button" className={styles.item} onClick={() => choose(() => setReporting(true))}>
          <ReportIcon size="md" />
          Report {first}
        </button>
        <button
          type="button"
          className={styles.item}
          disabled={block.isPending}
          onClick={() => choose(blockNow)}
        >
          <BlockIcon size="md" />
          Block {first}
        </button>
      </div>
      {reporting && (
        <Suspense fallback={null}>
          <ReportDialog
            person={person}
            onClose={() => {
              setReporting(false);
              triggerRef.current?.focus();
            }}
            onBlocked={onBlocked}
          />
        </Suspense>
      )}
    </>
  );
}
