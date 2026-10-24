import { useId, useState, type ReactNode } from 'react';
import { useSignOut } from '../api/auth';
import { useMe } from '../api/me';
import { useBlock, useBlocks, useUpdateSettings } from '../api/safety';
import type { Settings } from '../api/types';
import { Aura } from '../ui/Aura';
import { HiddenIcon } from '../ui/icons/generated';
import styles from './AccountMenu.module.css';

/**
 * Your aura, top right, like the account avatar in Google Maps. Opens a small panel (a native
 * popover: Escape and tapping outside close it) with who you are, your privacy and notification
 * switches, the people you've blocked, and Sign out. While you're hidden, the aura says so.
 */
export default function AccountMenu() {
  const me = useMe();
  const signOut = useSignOut();
  const update = useUpdateSettings();
  const panelId = useId();
  if (!me.data) return null;
  const { id, displayName, email, settings } = me.data;
  const hidden = settings.hiddenFromMap;
  const toggle = (key: keyof Settings) => (on: boolean) => update.mutate({ [key]: on });

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        popoverTarget={panelId}
        aria-label={hidden ? "Your account. You're hidden from the map" : 'Your account'}
      >
        <Aura seed={id} className={styles.aura} />
        {hidden && (
          <span className={styles.hiddenBadge}>
            <HiddenIcon size="sm" />
          </span>
        )}
      </button>
      <div id={panelId} popover="auto" className={styles.panel}>
        <p className={styles.name}>{displayName ?? 'You'}</p>
        <p className={styles.email}>{email}</p>

        <div className={styles.group}>
          <Switch
            label="Hide me from the map"
            hint="Off the map, search and discovery. Chats keep working."
            checked={hidden}
            onChange={toggle('hiddenFromMap')}
          />
        </div>

        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Notify me about</legend>
          <Switch label="Chats" checked={settings.notifyChats} onChange={toggle('notifyChats')} />
          <Switch label="Glows" checked={settings.notifyGlows} onChange={toggle('notifyGlows')} />
        </fieldset>
        {update.isError && (
          <p className={styles.email} role="alert">
            Couldn't save that. Try again.
          </p>
        )}

        <Blocked />

        {signOut.isError && (
          <p className={styles.email} role="alert">
            Couldn't sign out. Try again.
          </p>
        )}
        <button
          type="button"
          className={styles.action}
          disabled={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          Sign out
        </button>
      </div>
    </>
  );
}

/** A native checkbox shown as a switch: the platform keeps it accessible, we draw it. */
function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const hintId = useId();
  return (
    <label className={styles.switchRow}>
      <span className={styles.switchText}>
        {label}
        {hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        className={styles.switch}
        checked={checked}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

/** The people you've blocked, behind a disclosure so the panel stays short. Unblocking is instant. */
function Blocked() {
  const [open, setOpen] = useState(false);
  const blocks = useBlocks(open);
  const block = useBlock();
  const listId = useId();
  const people = blocks.data ?? [];

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.disclosure}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
      >
        Blocked people
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {open && (
        <div id={listId}>
          {blocks.isPending ? (
            <p className={styles.hint} aria-busy="true">
              Loading…
            </p>
          ) : blocks.isError ? (
            <p className={styles.hint} role="alert">
              Couldn't load them. Try again.
            </p>
          ) : people.length === 0 ? (
            <p className={styles.hint}>No one. Blocking someone hides you from each other.</p>
          ) : (
            <ul className={styles.blocked} aria-label="Blocked people">
              {people.map((person) => (
                <li key={person.id} className={styles.blockedRow}>
                  <Aura seed={person.id} className={styles.blockedAura} />
                  <span className={styles.blockedName}>{person.displayName}</span>
                  <button
                    type="button"
                    className={styles.unblock}
                    disabled={block.isPending}
                    onClick={() => block.mutate({ personId: person.id, blocked: false })}
                    aria-label={`Unblock ${person.displayName}`}
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
