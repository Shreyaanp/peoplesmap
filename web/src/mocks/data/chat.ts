import type { InboxSummary, Message, MessageInput, ThreadSummary } from '../../api/types';
import { createRandom, uuidV7, type Random } from './random';
import type { MockPerson, MockWorld } from './world';

/**
 * One person's inbox, the way the server keeps it: one thread per pair, each in Chats or Glows.
 * Chats hold people I connect to (or whose Glow I accepted or answered); Glows hold everyone else.
 */

type Folder = ThreadSummary['folder'];

interface MockThread {
  id: string;
  other: MockPerson;
  folder: Folder;
  ignored: boolean;
  /** Oldest first. */
  messages: Message[];
  /** The last message I have read. */
  readUpTo: string | null;
}

export interface Inbox {
  readonly me: MockPerson;
  list(folder: Folder): ThreadSummary[];
  get(threadId: string): ThreadSummary | undefined;
  /** Our thread, if any (ignored ones too: the server still knows it). */
  threadWith(personId: string): ThreadSummary | undefined;
  messages(threadId: string, page: { after?: string; before?: string; limit: number }): MessagePage;
  /** Adds my message (idempotent on its id). Replying from Glows moves the thread to Chats. */
  send(threadId: string, input: MessageInput): { message: Message; created: boolean } | undefined;
  /** First message to someone; reuses our thread when there is one. */
  start(
    other: MockPerson,
    input: MessageInput,
  ): { thread: ThreadSummary; message: Message; created: boolean };
  /** A message from them, as if it arrived over the socket. */
  receive(threadId: string, body: string): Message | undefined;
  markRead(threadId: string, upTo: string): boolean;
  accept(threadId: string): ThreadSummary | undefined;
  ignore(threadId: string): boolean;
  unignore(threadId: string): ThreadSummary | undefined;
  /** I connected to them: their Glow, if any, moves to Chats. */
  connected(personId: string): void;
  summary(): InboxSummary;
}

export interface MessagePage {
  items: Message[];
  hasMore: boolean;
}

const minute = 60_000;

/** Openers a stranger might send, keyed by nothing in particular: `{tag}` is a tag we share. */
const glowOpeners = [
  'Hey! Saw you on the map with #{tag}. Do you have a regular spot?',
  'Hi, I am pretty new to #{tag}. Would you be up for meeting sometime this week?',
  'Hello! A few of us do #{tag} on Sunday mornings, you are welcome to join.',
];

/** A seeded conversation for Chats, oldest first; `me` marks my lines. */
const chatScripts: { me: boolean; body: string }[][] = [
  [
    { me: false, body: 'Court 3 at Gachibowli stadium is free at 7 tomorrow' },
    { me: true, body: 'Perfect, I will bring shuttles' },
    { me: false, body: 'See you there!' },
  ],
  [
    { me: true, body: 'Thanks for the trek tips last week' },
    { me: false, body: 'Anytime. Ananthagiri is lovely after the rain' },
  ],
  [
    { me: false, body: 'Are you still up for the photo walk in Charminar?' },
    { me: true, body: 'Yes! Saturday morning works for me' },
    { me: false, body: 'Great, meeting at 6:30 near the Mecca Masjid gate' },
    { me: false, body: 'Bring a wide lens if you have one' },
  ],
];

/** Short replies the other person sends back a moment after I write. */
export const mockReplies = [
  'Sounds good!',
  'Haha yes, exactly',
  'Let me check and get back to you',
  'Sure, what time works for you?',
  'Nice, see you then',
];

function sharedTag(a: MockPerson, b: MockPerson): string | undefined {
  const mine = new Set(a.tags.map((t) => t.slug));
  return b.tags.find((t) => mine.has(t.slug))?.display;
}

/**
 * Seeds an inbox for `me`: a few Chats with people I connect to, a few Glows from strangers who
 * share an interest. Returns the inbox and the people I connect to, for the connections store.
 */
export function createInbox(
  world: MockWorld,
  me: MockPerson,
  now = Date.now(),
): { inbox: Inbox; connected: string[] } {
  const random = createRandom(hashSeed(me.id));
  const threads = new Map<string, MockThread>();
  const others = world.people.filter((p) => p !== me && !p.hiddenFromMap);

  const pickOthers = (count: number, wanted: (p: MockPerson) => boolean) => {
    const pool = others.filter((p) => wanted(p) && ![...threads.values()].some((t) => t.other === p));
    const chosen: MockPerson[] = [];
    while (chosen.length < count && pool.length > 0) {
      chosen.push(pool.splice(Math.floor(random.next() * pool.length), 1)[0] as MockPerson);
    }
    return chosen;
  };

  const message = (thread: MockThread, senderId: string, body: string, at: number): Message => {
    const m: Message = {
      id: uuidV7(random, at),
      threadId: thread.id,
      senderId,
      body,
      sentAt: new Date(at).toISOString(),
    };
    thread.messages.push(m);
    return m;
  };

  // Chats: people near me, conversations from the last few days.
  const sameArea = (p: MockPerson) => p.locality === me.locality;
  pickOthers(chatScripts.length, sameArea).forEach((other, i) => {
    const script = chatScripts[i] ?? [];
    let at = now - (i * 26 + 3) * 60 * minute;
    const thread: MockThread = {
      id: uuidV7(random, at),
      other,
      folder: 'chats',
      ignored: false,
      messages: [],
      readUpTo: null,
    };
    for (const line of script) {
      at += random.int(2, 20) * minute;
      message(thread, line.me ? me.id : other.id, line.body, at);
    }
    // The first thread has news; the rest are read.
    const last = thread.messages.at(-1);
    thread.readUpTo = i === 0 ? (thread.messages.at(-2)?.id ?? null) : (last?.id ?? null);
    threads.set(thread.id, thread);
  });

  // Glows: strangers who share a tag with me, each with one unread opener.
  pickOthers(glowOpeners.length, (p) => sharedTag(me, p) !== undefined).forEach((other, i) => {
    const at = now - (i * 90 + 25) * minute;
    const thread: MockThread = {
      id: uuidV7(random, at),
      other,
      folder: 'glows',
      ignored: false,
      messages: [],
      readUpTo: null,
    };
    const opener = (glowOpeners[i] ?? '').replace('{tag}', sharedTag(me, other) ?? 'this');
    message(thread, other.id, opener, at);
    threads.set(thread.id, thread);
  });

  const connected = [...threads.values()].filter((t) => t.folder === 'chats').map((t) => t.other.id);
  return { inbox: inboxFrom(me, threads, random), connected };
}

function inboxFrom(me: MockPerson, threads: Map<string, MockThread>, random: Random): Inbox {
  const unread = (t: MockThread) => {
    const start = t.readUpTo ? t.messages.findIndex((m) => m.id === t.readUpTo) + 1 : 0;
    return t.messages.slice(start).filter((m) => m.senderId !== me.id).length;
  };

  const summary = (t: MockThread): ThreadSummary => {
    const last = t.messages.at(-1);
    if (!last) throw new Error('A thread always has a message');
    const mine = new Set(me.tags.map((tag) => tag.slug));
    return {
      id: t.id,
      folder: t.folder,
      other: { id: t.other.id, displayName: t.other.displayName, photo: null },
      sharedTags: t.other.tags
        .filter((tag) => mine.has(tag.slug))
        .slice(0, 3)
        .map(({ slug, display }) => ({ slug, display })),
      lastMessage: last,
      unreadCount: unread(t),
      // The other person reads instantly in the mock, but receipts only show in their Chats.
      otherReadUpTo:
        t.folder === 'chats' ? (t.messages.filter((m) => m.senderId === me.id).at(-1)?.id ?? null) : null,
      updatedAt: last.sentAt,
    };
  };

  const visible = (id: string) => {
    const t = threads.get(id);
    return t && !t.ignored ? t : undefined;
  };

  const add = (t: MockThread, senderId: string, input: MessageInput) => {
    const existing = t.messages.find((m) => m.id === input.id);
    if (existing) return { message: existing, created: false };
    const message: Message = {
      id: input.id,
      threadId: t.id,
      senderId,
      body: input.body,
      sentAt: new Date().toISOString(),
    };
    t.messages.push(message);
    return { message, created: true };
  };

  return {
    me,
    list: (folder) =>
      [...threads.values()]
        .filter((t) => t.folder === folder && !t.ignored)
        .map(summary)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    get: (id) => {
      const t = visible(id);
      return t && summary(t);
    },
    threadWith: (personId) => {
      const t = [...threads.values()].find((x) => x.other.id === personId && !x.ignored);
      return t && summary(t);
    },
    messages: (id, { after, before, limit }) => {
      const all = visible(id)?.messages ?? [];
      if (after) {
        const start = all.findIndex((m) => m.id === after) + 1;
        const items = all.slice(start, start + limit);
        return { items, hasMore: start + limit < all.length };
      }
      const end = before
        ? Math.max(
            0,
            all.findIndex((m) => m.id === before),
          )
        : all.length;
      const items = all.slice(Math.max(0, end - limit), end).reverse();
      return { items, hasMore: end - limit > 0 };
    },
    send: (id, input) => {
      const t = visible(id);
      if (!t) return undefined;
      const sent = add(t, me.id, input);
      t.folder = 'chats';
      t.readUpTo = sent.message.id;
      return sent;
    },
    start: (other, input) => {
      let t = [...threads.values()].find((x) => x.other.id === other.id);
      const created = !t;
      if (!t) {
        t = {
          id: uuidV7(random, Date.now()),
          other,
          folder: 'chats',
          ignored: false,
          messages: [],
          readUpTo: null,
        };
        threads.set(t.id, t);
      }
      t.ignored = false;
      t.folder = 'chats';
      const { message } = add(t, me.id, input);
      t.readUpTo = message.id;
      return { thread: summary(t), message, created };
    },
    receive: (id, body) => {
      const t = threads.get(id);
      if (!t) return undefined;
      return add(t, t.other.id, { id: uuidV7(random, Date.now()), body }).message;
    },
    markRead: (id, upTo) => {
      const t = visible(id);
      if (!t || !t.messages.some((m) => m.id === upTo)) return false;
      const current = t.readUpTo ? t.messages.findIndex((m) => m.id === t.readUpTo) : -1;
      if (t.messages.findIndex((m) => m.id === upTo) > current) t.readUpTo = upTo;
      return true;
    },
    accept: (id) => {
      const t = visible(id);
      if (!t) return undefined;
      t.folder = 'chats';
      return summary(t);
    },
    ignore: (id) => {
      const t = threads.get(id);
      if (!t) return false;
      t.ignored = true;
      return true;
    },
    unignore: (id) => {
      const t = threads.get(id);
      if (!t) return undefined;
      t.ignored = false;
      return summary(t);
    },
    connected: (personId) => {
      for (const t of threads.values()) if (t.other.id === personId && !t.ignored) t.folder = 'chats';
    },
    summary: () => {
      const open = [...threads.values()].filter((t) => !t.ignored);
      const count = (folder: Folder) =>
        open.filter((t) => t.folder === folder).reduce((sum, t) => sum + unread(t), 0);
      return { chatsUnread: count('chats'), glowsUnread: count('glows') };
    },
  };
}

/** A stable 32-bit seed from an id, so each person's inbox is the same on every reload. */
function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}
