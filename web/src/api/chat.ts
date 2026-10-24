import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import { noContent, queryKeys, unwrap } from './core';
import type { Folder, Message, MessageInput, ThreadSummary, ThreadWithMessage } from './types';
import { uuidv7 } from './uuid';

/**
 * Chats and Glows. The server is the truth; until the realtime socket lands (api/realtime.md) the
 * open conversation polls for new messages and the folders refresh on every change.
 */

/** How many recent messages a conversation loads. */
const messageLimit = 50;
/** How often an open conversation checks for new messages (the socket will replace this). */
const openThreadPoll = 4_000;

const refreshInbox = (client: QueryClient) => client.invalidateQueries({ queryKey: queryKeys.inbox });

export function useThreads(folder: Folder) {
  return useQuery({
    queryKey: queryKeys.threads(folder),
    queryFn: async ({ signal }) =>
      (await unwrap(api.GET('/threads', { params: { query: { folder } }, signal }))).items,
    staleTime: 10_000,
  });
}

export function useThread(id: string | null) {
  return useQuery<ThreadSummary>({
    queryKey: queryKeys.thread(id ?? ''),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/threads/{threadId}', { params: { path: { threadId: id ?? '' } }, signal })),
    enabled: id !== null,
    staleTime: 10_000,
  });
}

/** A conversation's recent messages, oldest first. */
export function useMessages(threadId: string | null) {
  return useQuery<Message[]>({
    queryKey: queryKeys.messages(threadId ?? ''),
    queryFn: async ({ signal }) => {
      const page = await unwrap(
        api.GET('/threads/{threadId}/messages', {
          params: { path: { threadId: threadId ?? '' }, query: { limit: messageLimit } },
          signal,
        }),
      );
      return page.items.toReversed();
    },
    enabled: threadId !== null,
    refetchInterval: openThreadPoll,
  });
}

function appendMessage(client: QueryClient, message: Message) {
  client.setQueryData<Message[]>(queryKeys.messages(message.threadId), (old = []) =>
    old.some((m) => m.id === message.id) ? old : [...old, message],
  );
}

/** A message on its way: shown at once, marked failed if it doesn't arrive. */
export interface OutgoingMessage {
  id: string;
  body: string;
  failed: boolean;
}

const sendKey = (to: string) => ['send', to] as const;

/**
 * Messages sent from this screen that the server hasn't confirmed yet, newest attempt per id.
 * `to` is the thread id, or the person's id for a first message.
 */
function useOutbox(to: string): OutgoingMessage[] {
  const attempts = useMutationState({
    filters: { mutationKey: sendKey(to) },
    select: (m) => ({ input: m.state.variables as MessageInput, status: m.state.status }),
  });
  const latest = new Map<string, { body: string; status: string }>();
  for (const { input, status } of attempts) latest.set(input.id, { body: input.body, status });
  return [...latest]
    .filter(([, a]) => a.status === 'pending' || a.status === 'error')
    .map(([id, a]) => ({ id, body: a.body, failed: a.status === 'error' }));
}

/** Sends in an existing conversation. Retrying a failed message resends the same id (idempotent). */
export function useSendMessage(threadId: string) {
  const client = useQueryClient();
  const send = useMutation({
    mutationKey: sendKey(threadId),
    mutationFn: (input: MessageInput) =>
      unwrap(api.POST('/threads/{threadId}/messages', { params: { path: { threadId } }, body: input })),
    onSuccess: (message) => {
      appendMessage(client, message);
      void refreshInbox(client);
    },
  });
  const outbox = useOutbox(threadId);
  return {
    outbox,
    send: (body: string) => send.mutate({ id: uuidv7(), body }),
    retry: (message: OutgoingMessage) => send.mutate({ id: message.id, body: message.body }),
  };
}

/** The first message to someone with no conversation yet. Resolves with the new thread. */
export function useStartThread(recipientId: string, onStarted: (thread: ThreadSummary) => void) {
  const client = useQueryClient();
  const start = useMutation({
    mutationKey: sendKey(recipientId),
    mutationFn: (message: MessageInput) =>
      unwrap<ThreadWithMessage>(api.POST('/threads', { body: { recipientId, message } })),
    onSuccess: ({ thread, message }) => {
      client.setQueryData(queryKeys.thread(thread.id), thread);
      appendMessage(client, message);
      void client.invalidateQueries({ queryKey: queryKeys.person(recipientId) });
      void refreshInbox(client);
      onStarted(thread);
    },
  });
  const outbox = useOutbox(recipientId);
  return {
    outbox,
    send: (body: string) => start.mutate({ id: uuidv7(), body }),
    retry: (message: OutgoingMessage) => start.mutate({ id: message.id, body: message.body }),
  };
}

/** Marks the conversation read up to its latest message, then refreshes the badges. */
export function useMarkRead(threadId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (upTo: string) =>
      noContent(api.POST('/threads/{threadId}/read', { params: { path: { threadId } }, body: { upTo } })),
    onSuccess: () => refreshInbox(client),
  });
}

/** Moves a Glow to Chats without replying. */
export function useAcceptGlow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) =>
      unwrap(api.POST('/threads/{threadId}/accept', { params: { path: { threadId } } })),
    onSuccess: () => refreshInbox(client),
  });
}

/**
 * Ignores a Glow, silently: it leaves the list at once (optimistic), and `undo` brings it back.
 * The sender is never told.
 */
export function useIgnoreGlow() {
  const client = useQueryClient();
  const ignore = useMutation({
    mutationFn: (threadId: string) =>
      noContent(api.POST('/threads/{threadId}/ignore', { params: { path: { threadId } } })),
    onMutate: async (threadId) => {
      await client.cancelQueries({ queryKey: queryKeys.threads('glows') });
      const previous = client.getQueryData<ThreadSummary[]>(queryKeys.threads('glows'));
      client.setQueryData<ThreadSummary[]>(queryKeys.threads('glows'), (old) =>
        old?.filter((t) => t.id !== threadId),
      );
      return { previous };
    },
    onError: (_error, _threadId, context) => {
      if (context?.previous) client.setQueryData(queryKeys.threads('glows'), context.previous);
    },
    onSettled: () => refreshInbox(client),
  });
  const undo = useMutation({
    mutationFn: (threadId: string) =>
      unwrap(api.DELETE('/threads/{threadId}/ignore', { params: { path: { threadId } } })),
    onSettled: () => refreshInbox(client),
  });
  return { ignore: ignore.mutate, undo: undo.mutate };
}
