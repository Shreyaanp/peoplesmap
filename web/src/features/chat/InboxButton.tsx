import { useInboxSummary } from '../../api/inbox';
import { openInbox } from '../../app/urlState';
import { ChatIcon } from '../../ui/icons/generated';
import styles from './InboxButton.module.css';

/**
 * Messages, top right beside your aura. The badge counts everything unread; news only in Glows
 * opens the inbox there.
 */
export default function InboxButton() {
  const summary = useInboxSummary();
  const chats = summary.data?.chatsUnread ?? 0;
  const glows = summary.data?.glowsUnread ?? 0;
  const unread = chats + glows;

  return (
    <button
      type="button"
      className={styles.button}
      data-inbox-trigger=""
      aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
      onClick={() => openInbox(chats === 0 && glows > 0 ? 'glows' : 'chats')}
    >
      <ChatIcon size="md" />
      {unread > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
