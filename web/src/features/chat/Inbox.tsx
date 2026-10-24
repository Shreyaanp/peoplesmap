import { AnimatePresence, domMax, LazyMotion } from 'motion/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTab, useTabList, useTabPanel } from 'react-aria';
import { Item, useTabListState, type Node, type TabListState } from 'react-stately';
import { useIgnoreGlow } from '../../api/chat';
import { useInboxSummary } from '../../api/inbox';
import type { ThreadSummary } from '../../api/types';
import {
  closeInbox,
  closeThread,
  showFolder,
  useDraftWith,
  useInboxFolder,
  useOpenThread,
  type InboxFolder,
} from '../../app/urlState';
import { BackIcon } from '../../ui/icons/generated';
import { Conversation } from './Conversation';
import styles from './Inbox.module.css';
import { ThreadList } from './ThreadList';

/** How long "Ignored · Undo" stays up. */
const undoWindow = 6_000;

/**
 * Messages: Chats (people you connect to) and Glows (everyone else, like message requests), with a
 * conversation sliding over the list. A panel over the map on phones, the side column on desktop.
 * Stays mounted once opened so it can slide away again.
 */
export default function Inbox() {
  const folder = useInboxFolder();
  const threadId = useOpenThread();
  const draftWith = useDraftWith();
  const talking = threadId ?? draftWith;
  const open = folder !== null || talking !== null;
  const { ignore, undo } = useIgnoreGlow();
  const [ignored, setIgnored] = useState<ThreadSummary | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus follows the panel: into it on open, back to the inbox button on close.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;
    if (open) headingRef.current?.focus({ preventScroll: true });
    else document.querySelector<HTMLElement>('[data-inbox-trigger]')?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!ignored) return;
    const timer = setTimeout(() => setIgnored(null), undoWindow);
    return () => clearTimeout(timer);
  }, [ignored]);

  const onIgnore = (thread: ThreadSummary) => {
    ignore(thread.id);
    setIgnored(thread);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    if (talking) closeThread();
    else closeInbox();
  };

  return (
    <LazyMotion features={domMax} strict>
      <aside
        className={styles.panel}
        data-open={open}
        inert={!open}
        aria-label="Messages"
        onKeyDown={onKeyDown}
      >
        <div className={styles.home} inert={talking !== null}>
          <header className={styles.header}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={closeInbox}
              aria-label="Back to the map"
            >
              <BackIcon size="md" />
            </button>
            <h2 ref={headingRef} className={styles.title} tabIndex={-1}>
              Messages
            </h2>
          </header>
          <Folders folder={folder ?? 'chats'} onIgnore={onIgnore} />
        </div>

        <AnimatePresence initial={false}>
          {talking !== null && (
            <Conversation key={talking} threadId={threadId} draftWith={draftWith} onIgnore={onIgnore} />
          )}
        </AnimatePresence>

        {ignored && (
          <div className={styles.toast} role="status">
            <span>Ignored. {ignored.other.displayName} won't be told.</span>
            <button
              type="button"
              className={styles.undo}
              onClick={() => {
                undo(ignored.id);
                setIgnored(null);
              }}
            >
              Undo
            </button>
          </div>
        )}
      </aside>
    </LazyMotion>
  );
}

const folderNames: Record<InboxFolder, string> = { chats: 'Chats', glows: 'Glows' };

/** The two folders as tabs (React Aria: arrow keys, roles), each with its unread count. */
function Folders({ folder, onIgnore }: { folder: InboxFolder; onIgnore: (thread: ThreadSummary) => void }) {
  const summary = useInboxSummary();
  const unread: Record<InboxFolder, number> = {
    chats: summary.data?.chatsUnread ?? 0,
    glows: summary.data?.glowsUnread ?? 0,
  };
  const state = useTabListState<object>({
    selectedKey: folder,
    onSelectionChange: (key) => showFolder(key === 'glows' ? 'glows' : 'chats'),
    children: (['chats', 'glows'] as const).map((key) => (
      <Item key={key} textValue={folderNames[key]}>
        {folderNames[key]}
        {unread[key] > 0 && (
          <span className={styles.count}>
            <span className="visuallyHidden">, </span>
            {unread[key]}
            <span className="visuallyHidden"> unread</span>
          </span>
        )}
      </Item>
    )),
  });
  const listRef = useRef<HTMLDivElement>(null);
  const { tabListProps } = useTabList({ 'aria-label': 'Folders' }, state, listRef);

  return (
    <>
      <div {...tabListProps} ref={listRef} className={styles.tabs}>
        {[...state.collection].map((item) => (
          <Tab key={item.key} item={item} state={state} />
        ))}
      </div>
      {/* Keyed: React Aria keeps the first panel id otherwise, and each folder starts at its top. */}
      <FolderPanel key={folder} state={state} folder={folder} onIgnore={onIgnore} />
    </>
  );
}

function Tab({ item, state }: { item: Node<object>; state: TabListState<object> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { tabProps } = useTab({ key: item.key }, state, ref);
  return (
    <div {...tabProps} ref={ref} className={styles.tab}>
      {item.rendered}
    </div>
  );
}

function FolderPanel({
  state,
  folder,
  onIgnore,
}: {
  state: TabListState<object>;
  folder: InboxFolder;
  onIgnore: (thread: ThreadSummary) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { tabPanelProps } = useTabPanel({}, state, ref);
  return (
    <div {...tabPanelProps} ref={ref} className={styles.folder}>
      <ThreadList folder={folder} onIgnore={onIgnore} />
    </div>
  );
}
