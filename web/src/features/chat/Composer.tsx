import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { SendIcon } from '../../ui/icons/generated';
import styles from './Composer.module.css';

/** The server's limit on one message. */
const maxLength = 2000;

interface ComposerProps {
  /** First name of the person written to, for the placeholder. */
  to: string;
  onSend: (body: string) => void;
}

/**
 * Where a message is written. Send is the screen's one main action (amber). Enter sends with a
 * keyboard; on a phone Enter is a new line and the button sends, like every messaging app.
 */
export function Composer({ to, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const id = useId();
  const ready = text.trim() !== '';

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!ready) return;
    onSend(text.trim());
    setText('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    submit(event);
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <label htmlFor={id} className="visuallyHidden">
        Message {to}
      </label>
      <textarea
        id={id}
        className={styles.input}
        rows={1}
        maxLength={maxLength}
        placeholder={`Message ${to}`}
        enterKeyHint="send"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button type="submit" className={styles.send} disabled={!ready} aria-label="Send">
        <SendIcon size="md" />
      </button>
    </form>
  );
}
