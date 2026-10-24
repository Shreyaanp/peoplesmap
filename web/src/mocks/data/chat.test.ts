import { describe, expect, it } from 'vitest';
import { uuidv7 } from '../../api/uuid';
import { createInbox } from './chat';
import { createWorld } from './world';

const now = Date.UTC(2026, 9, 23, 12);
const world = createWorld(2000, 42, now);

function fresh() {
  return createInbox(world, world.me, now);
}

describe('mock inbox', () => {
  it('seeds Chats with people I connect to and Glows from strangers who share a tag', () => {
    const { inbox, connected } = fresh();
    const chats = inbox.list('chats');
    const glows = inbox.list('glows');
    expect(chats.length).toBeGreaterThan(0);
    expect(glows.length).toBeGreaterThan(0);
    expect(connected.toSorted()).toEqual(chats.map((t) => t.other.id).toSorted());
    for (const glow of glows) {
      expect(glow.sharedTags?.length).toBeGreaterThan(0);
      expect(glow.unreadCount).toBe(1);
    }
  });

  it('is the same on every reload', () => {
    expect(fresh().inbox.list('chats')).toEqual(fresh().inbox.list('chats'));
  });

  it('lists newest first and counts unread for the badges', () => {
    const { inbox } = fresh();
    const chats = inbox.list('chats');
    expect(chats.map((t) => t.updatedAt)).toEqual(
      chats
        .map((t) => t.updatedAt)
        .toSorted()
        .reverse(),
    );
    const summary = inbox.summary();
    expect(summary.glowsUnread).toBe(inbox.list('glows').length);
    expect(summary.chatsUnread).toBe(chats.reduce((sum, t) => sum + t.unreadCount, 0));
  });

  it('moves a Glow to Chats when I reply, and resending the same id stores it once', () => {
    const { inbox } = fresh();
    const glow = inbox.list('glows')[0];
    if (!glow) throw new Error('No glow seeded');
    const input = { id: uuidv7(), body: 'Hi! Sunday works' };
    expect(inbox.send(glow.id, input)?.created).toBe(true);
    expect(inbox.send(glow.id, input)?.created).toBe(false);
    expect(inbox.get(glow.id)?.folder).toBe('chats');
    expect(inbox.messages(glow.id, { limit: 50 }).items.filter((m) => m.id === input.id)).toHaveLength(1);
  });

  it('ignores a Glow silently and undoes it', () => {
    const { inbox } = fresh();
    const glow = inbox.list('glows')[0];
    if (!glow) throw new Error('No glow seeded');
    inbox.ignore(glow.id);
    expect(inbox.list('glows').map((t) => t.id)).not.toContain(glow.id);
    expect(inbox.get(glow.id)).toBeUndefined();
    // Their later messages are kept but don't resurface the thread or notify.
    inbox.receive(glow.id, 'Hello again?');
    expect(inbox.summary().glowsUnread).toBe(inbox.list('glows').length);
    expect(inbox.unignore(glow.id)?.folder).toBe('glows');
    expect(inbox.list('glows').map((t) => t.id)).toContain(glow.id);
  });

  it('accepting or connecting moves a Glow to Chats', () => {
    const { inbox } = fresh();
    const [first, second] = inbox.list('glows');
    if (!first || !second) throw new Error('Two glows expected');
    inbox.accept(first.id);
    inbox.connected(second.other.id);
    expect(inbox.list('chats').map((t) => t.id)).toEqual(expect.arrayContaining([first.id, second.id]));
  });

  it('marks read up to a message, never backwards', () => {
    const { inbox } = fresh();
    const unread = inbox.list('chats').find((t) => t.unreadCount > 0);
    if (!unread) throw new Error('A chat with news expected');
    const [newest, older] = inbox.messages(unread.id, { limit: 2 }).items;
    if (!newest || !older) throw new Error('Two messages expected');
    inbox.markRead(unread.id, newest.id);
    inbox.markRead(unread.id, older.id);
    expect(inbox.get(unread.id)?.unreadCount).toBe(0);
  });

  it('pages messages: newest first by default and before a message, oldest first after one', () => {
    const { inbox } = fresh();
    const thread = inbox.list('chats').find((t) => inbox.messages(t.id, { limit: 50 }).items.length >= 3);
    if (!thread) throw new Error('A longer chat expected');
    const all = inbox.messages(thread.id, { limit: 50 }).items.toReversed();
    const [first, second, third] = all;
    if (!first || !second || !third) throw new Error('Three messages expected');
    expect(inbox.messages(thread.id, { after: first.id, limit: 1 })).toEqual({
      items: [second],
      hasMore: true,
    });
    expect(inbox.messages(thread.id, { before: third.id, limit: 1 }).items).toEqual([second]);
  });

  it('reuses our thread for a first message to someone we already talk to', () => {
    const { inbox } = fresh();
    const chat = inbox.list('chats')[0];
    const other = chat && world.byId.get(chat.other.id);
    if (!chat || !other) throw new Error('A chat expected');
    const started = inbox.start(other, { id: uuidv7(), body: 'Hey again' });
    expect(started.created).toBe(false);
    expect(started.thread.id).toBe(chat.id);
  });

  it('blocking hides our thread and its unread count; unblocking brings it back', () => {
    const { inbox } = fresh();
    const glow = inbox.list('glows')[0];
    if (!glow) throw new Error('No glow seeded');
    const before = inbox.summary().glowsUnread;
    inbox.block(glow.other.id);
    expect(inbox.list('glows').map((t) => t.id)).not.toContain(glow.id);
    expect(inbox.get(glow.id)).toBeUndefined();
    expect(inbox.threadWith(glow.other.id)).toBeUndefined();
    expect(inbox.summary().glowsUnread).toBe(before - glow.unreadCount);
    inbox.unblock(glow.other.id);
    expect(inbox.get(glow.id)?.folder).toBe('glows');
  });

  it('knows who wrote a message, for reports about one', () => {
    const { inbox } = fresh();
    const glow = inbox.list('glows')[0];
    if (!glow) throw new Error('No glow seeded');
    expect(inbox.messageSender(glow.lastMessage.id)).toBe(glow.other.id);
    expect(inbox.messageSender('missing')).toBeUndefined();
  });
});
