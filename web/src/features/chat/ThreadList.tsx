import { AnimatePresence, m } from 'motion/react';
import { useAcceptGlow, useThreads } from '../../api/chat';
import { useMe } from '../../api/me';
import type { ThreadSummary } from '../../api/types';
import { closeInbox, openThread, type InboxFolder } from '../../app/urlState';
import { spring, useMotionTransition } from '../../motion';
import { Aura } from '../../ui/Aura';
import { formatSentAt } from '../../ui/format';
import { TagChip } from '../../ui/TagChip';
import styles from './ThreadList.module.css';

interface ThreadListProps {
  folder: InboxFolder;
  onIgnore: (thread: ThreadSummary) => void;
}

/** One folder's conversations, newest first. A Glow that's accepted or ignored slides out. */
export function ThreadList({ folder, onIgnore }: ThreadListProps) {
  const threads = useThreads(folder);
  const transition = useMotionTransition(spring.crisp);

  if (threads.isError) {
    return (
      <div className={styles.empty} role="alert">
        <p>Couldn't load your messages.</p>
        <button type="button" className={styles.action} onClick={() => void threads.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  if (!threads.data) {
    return (
      <ul className={styles.list} aria-busy="true" aria-label="Loading conversations">
        {[0, 1, 2].map((i) => (
          <li key={i} className={styles.placeholder} />
        ))}
      </ul>
    );
  }

  if (threads.data.length === 0) return <Empty folder={folder} />;

  return (
    <>
      {folder === 'glows' && (
        <p className={styles.explainer}>
          From people you don't connect to. Reply or accept to move them to Chats.
        </p>
      )}
      <ul className={styles.list} aria-label={folder === 'glows' ? 'Glows' : 'Chats'}>
        <AnimatePresence initial={false}>
          {threads.data.map((thread) => (
            <m.li
              key={thread.id}
              layout="position"
              className={styles.item}
              exit={{ opacity: 0, x: -24 }}
              transition={transition}
            >
              {folder === 'glows' ? (
                <GlowRow thread={thread} onIgnore={onIgnore} />
              ) : (
                <ChatRow thread={thread} />
              )}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}

function Empty({ folder }: { folder: InboxFolder }) {
  if (folder === 'glows') {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No Glows right now</p>
        <p>When someone you don't connect to writes, it lands here first. You choose whether to reply.</p>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>No chats yet</p>
      <p>Find someone on the map who shares an interest, and say hi from their profile.</p>
      <button type="button" className={styles.action} onClick={closeInbox}>
        Explore the map
      </button>
    </div>
  );
}

/** "You: see you there" for my last message; theirs as is. */
function usePreview(thread: ThreadSummary): string {
  const me = useMe();
  const { lastMessage } = thread;
  return lastMessage.senderId === me.data?.id ? `You: ${lastMessage.body}` : lastMessage.body;
}

function ChatRow({ thread }: { thread: ThreadSummary }) {
  const preview = usePreview(thread);
  const unread = thread.unreadCount > 0;
  return (
    <button type="button" className={styles.row} data-unread={unread} onClick={() => openThread(thread.id)}>
      <Aura seed={thread.other.id} className={styles.avatar} />
      <span className={styles.text}>
        <span className={styles.line}>
          <span className={styles.name}>{thread.other.displayName}</span>
          <time className={styles.time} dateTime={thread.updatedAt}>
            {formatSentAt(thread.updatedAt)}
          </time>
        </span>
        <span className={styles.line}>
          <span className={styles.preview}>{preview}</span>
          {unread && (
            <span className={styles.unread}>
              {thread.unreadCount}
              <span className="visuallyHidden"> unread</span>
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/**
 * A message from someone you don't connect to: who they are, what you share, the whole message,
 * and Accept / Ignore. Ignoring is silent and undoable.
 */
function GlowRow({ thread, onIgnore }: { thread: ThreadSummary; onIgnore: (thread: ThreadSummary) => void }) {
  const accept = useAcceptGlow();
  const unread = thread.unreadCount > 0;
  const shared = thread.sharedTags ?? [];
  return (
    <div className={styles.glow}>
      <button type="button" className={styles.row} data-unread={unread} onClick={() => openThread(thread.id)}>
        <span className={styles.halo} data-lit={unread}>
          <Aura seed={thread.other.id} className={styles.avatar} />
        </span>
        <span className={styles.text}>
          <span className={styles.line}>
            <span className={styles.name}>{thread.other.displayName}</span>
            <time className={styles.time} dateTime={thread.updatedAt}>
              {formatSentAt(thread.updatedAt)}
            </time>
          </span>
          {shared.length > 0 && (
            <span className={styles.tags}>
              {shared.map((tag) => (
                <TagChip key={tag.slug} display={tag.display} shared />
              ))}
            </span>
          )}
          <span className={styles.message}>{thread.lastMessage.body}</span>
        </span>
      </button>
      <div className={styles.choices}>
        <button
          type="button"
          className={styles.action}
          disabled={accept.isPending}
          onClick={() => accept.mutate(thread.id)}
          aria-label={`Accept ${thread.other.displayName}`}
        >
          Accept
        </button>
        <button
          type="button"
          className={styles.quiet}
          onClick={() => onIgnore(thread)}
          aria-label={`Ignore ${thread.other.displayName}`}
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
