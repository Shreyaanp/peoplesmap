import { m } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  useAcceptGlow,
  useMarkRead,
  useMessages,
  useSendMessage,
  useStartThread,
  useThread,
  type OutgoingMessage,
} from '../../api/chat';
import { useMe } from '../../api/me';
import { useProfile } from '../../api/queries';
import type { Message, PersonMini, TagRef, ThreadSummary } from '../../api/types';
import { closeThread, openThread, showPersonFromChat } from '../../app/urlState';
import { spring, useMotionTransition, useReducedMotionPreference } from '../../motion';
import { Aura } from '../../ui/Aura';
import { formatClock, formatSentAt } from '../../ui/format';
import { BackIcon } from '../../ui/icons/generated';
import { TagChip } from '../../ui/TagChip';
import { Composer } from './Composer';
import styles from './Conversation.module.css';

interface ConversationProps {
  threadId: string | null;
  /** A first message to this person: there is no thread until it is sent. */
  draftWith: string | null;
  onIgnore: (thread: ThreadSummary) => void;
}

/** A conversation sliding in over the inbox (or the profile it was opened from). */
export function Conversation({ threadId, draftWith, onIgnore }: ConversationProps) {
  const reduced = useReducedMotionPreference();
  const transition = useMotionTransition(spring.sheet);
  const away = reduced ? { opacity: 0 } : { x: '100%' };
  return (
    <m.section
      className={styles.conversation}
      initial={away}
      animate={reduced ? { opacity: 1 } : { x: 0 }}
      exit={away}
      transition={transition}
      aria-label="Conversation"
    >
      {threadId ? (
        <ThreadConversation threadId={threadId} onIgnore={onIgnore} />
      ) : draftWith ? (
        <FirstMessage personId={draftWith} />
      ) : null}
    </m.section>
  );
}

function ThreadConversation({
  threadId,
  onIgnore,
}: {
  threadId: string;
  onIgnore: ConversationProps['onIgnore'];
}) {
  const thread = useThread(threadId);
  const messages = useMessages(threadId);
  const { outbox, send, retry } = useSendMessage(threadId);
  const markRead = useMarkRead(threadId);
  const accept = useAcceptGlow();
  const me = useMe();
  const myId = me.data?.id ?? '';

  // Reading the conversation clears its unread count, once per newest message.
  const last = messages.data?.at(-1);
  const unread = thread.data?.unreadCount ?? 0;
  const { mutate: read } = markRead;
  useEffect(() => {
    if (last && last.senderId !== myId && unread > 0) read(last.id);
  }, [last, myId, unread, read]);

  if (thread.isError || messages.isError) {
    return (
      <>
        <Header person={null} />
        <div className={styles.problem} role="alert">
          <p>This conversation isn't available.</p>
          <button type="button" className={styles.secondary} onClick={closeThread}>
            Back
          </button>
        </div>
      </>
    );
  }

  const summary = thread.data;
  const glow = summary?.folder === 'glows';
  const first = firstName(summary?.other.displayName);

  return (
    <>
      <Header person={summary?.other ?? null} sharedTags={glow ? summary.sharedTags : undefined} />
      <Messages
        messages={messages.data}
        outbox={outbox}
        myId={myId}
        readUpTo={summary?.otherReadUpTo ?? null}
        onRetry={retry}
        name={summary?.other.displayName}
      />
      {glow && summary && (
        <div className={styles.glowBar}>
          <p className={styles.glowNote}>
            {first} isn't in your Chats. Replying or accepting moves them there.
          </p>
          <div className={styles.glowChoices}>
            <button
              type="button"
              className={styles.secondary}
              disabled={accept.isPending}
              onClick={() => accept.mutate(summary.id)}
            >
              Accept
            </button>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                onIgnore(summary);
                closeThread();
              }}
            >
              Ignore
            </button>
          </div>
        </div>
      )}
      <Composer to={first} onSend={send} />
    </>
  );
}

/** Writing to someone for the first time. Sending creates the conversation and swaps it in. */
function FirstMessage({ personId }: { personId: string }) {
  const profile = useProfile(personId);
  const { outbox, send, retry } = useStartThread(personId, (thread) => openThread(thread.id));
  const me = useMe();
  const existing = profile.data?.threadId;

  // We already have a conversation: show it instead.
  useEffect(() => {
    if (existing) openThread(existing);
  }, [existing]);

  const person = profile.data ?? null;
  const shared = person?.tags.filter((t) => t.shared) ?? [];
  const first = firstName(person?.displayName);

  return (
    <>
      <Header person={person} />
      {outbox.length > 0 ? (
        <Messages
          messages={[]}
          outbox={outbox}
          myId={me.data?.id ?? ''}
          readUpTo={null}
          onRetry={retry}
          name={person?.displayName}
        />
      ) : (
        <div className={styles.intro}>
          {person && (
            <>
              <p className={styles.introTitle}>Say hi to {first}</p>
              {shared.length > 0 ? (
                <>
                  <p className={styles.introText}>You both like</p>
                  <div className={styles.introTags}>
                    {shared.slice(0, 3).map((tag) => (
                      <TagChip key={tag.slug} display={tag.display} shared />
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.introText}>Your message goes to their Glows until they reply.</p>
              )}
            </>
          )}
        </div>
      )}
      <Composer to={first} onSend={send} />
    </>
  );
}

function Header({ person, sharedTags }: { person: PersonMini | null; sharedTags?: TagRef[] | undefined }) {
  return (
    <header className={styles.header}>
      <button type="button" className={styles.back} onClick={closeThread} aria-label="Back">
        <BackIcon size="md" />
      </button>
      {person && (
        <button
          type="button"
          className={styles.person}
          onClick={() => showPersonFromChat(person.id)}
          aria-label={`${person.displayName}, view profile`}
        >
          <Aura seed={person.id} className={styles.avatar} />
          <span className={styles.who}>
            <span className={styles.name}>{person.displayName}</span>
            {sharedTags && sharedTags.length > 0 && (
              <span className={styles.sub}>
                Glow · you both like {sharedTags.map((t) => `#${t.display}`).join(' ')}
              </span>
            )}
          </span>
        </button>
      )}
    </header>
  );
}

interface MessagesProps {
  messages: Message[] | undefined;
  outbox: OutgoingMessage[];
  myId: string;
  /** Their read receipt: my last message up to here shows "Seen". */
  readUpTo: string | null;
  onRetry: (message: OutgoingMessage) => void;
  name: string | undefined;
}

/** A gap this long between two messages starts a new time label. */
const timeGap = 30 * 60_000;

function timeLabel(sentAt: string): string {
  const short = formatSentAt(sentAt);
  return /^(now|\d+[mh])$/.test(short) ? `Today ${formatClock(sentAt)}` : `${short}, ${formatClock(sentAt)}`;
}

/**
 * The messages, oldest at the top, kept scrolled to the newest. Messages that arrive while open
 * rise into place; the ones there on opening just appear.
 */
function Messages({ messages, outbox, myId, readUpTo, onRetry, name }: MessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const transition = useMotionTransition(spring.crisp);
  const reduced = useReducedMotionPreference();
  // The messages there on opening; only later ones animate in.
  const [initial, setInitial] = useState<ReadonlySet<string> | null>(null);
  if (messages && !initial) setInitial(new Set(messages.map((msg) => msg.id)));

  const confirmed = messages ?? [];
  const known = new Set(confirmed.map((msg) => msg.id));
  const pending = outbox.filter((o) => !known.has(o.id));
  const count = confirmed.length + pending.length;
  const lastMine = confirmed.findLast((msg) => msg.senderId === myId);

  // Stay pinned to the newest message.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const rise = (id: string) =>
    !initial || initial.has(id) ? false : reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 };

  if (!messages && pending.length === 0) {
    return <div className={styles.messages} aria-busy="true" aria-label="Loading messages" />;
  }

  return (
    <div
      ref={scrollRef}
      className={styles.messages}
      role="log"
      aria-label={name ? `Messages with ${name}` : 'Messages'}
    >
      <ol className={styles.list}>
        {confirmed.map((msg, i) => {
          const previous = confirmed[i - 1];
          const mine = msg.senderId === myId;
          const newGroup = !previous || previous.senderId !== msg.senderId;
          const showTime = !previous || Date.parse(msg.sentAt) - Date.parse(previous.sentAt) > timeGap;
          return (
            <m.li
              key={msg.id}
              className={styles.item}
              data-mine={mine}
              data-group-start={newGroup || showTime}
              initial={rise(msg.id)}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={transition}
            >
              {showTime && <span className={styles.timeLabel}>{timeLabel(msg.sentAt)}</span>}
              <span className={styles.bubble}>
                <span className="visuallyHidden">{mine ? 'You' : name}: </span>
                {msg.body}
              </span>
              {msg === lastMine && readUpTo === msg.id && i === confirmed.length - 1 && (
                <span className={styles.receipt}>Seen</span>
              )}
            </m.li>
          );
        })}
        {pending.map((msg) => (
          <m.li
            key={msg.id}
            className={styles.item}
            data-mine="true"
            data-pending={!msg.failed}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={transition}
          >
            <span className={styles.bubble}>
              <span className="visuallyHidden">You: </span>
              {msg.body}
            </span>
            {msg.failed ? (
              <button type="button" className={styles.retry} onClick={() => onRetry(msg)}>
                Not sent. Tap to try again
              </button>
            ) : (
              <span className={styles.receipt}>Sending…</span>
            )}
          </m.li>
        ))}
      </ol>
    </div>
  );
}

function firstName(displayName: string | null | undefined): string {
  return displayName?.split(' ')[0] ?? 'them';
}
