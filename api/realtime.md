# Realtime contract (STOMP over WebSocket)

Draft for review. OpenAPI cannot describe this part, so it lives here.

The socket only gives **hints**. The REST endpoints in `openapi.yaml` are the truth: on every (re)connect the client calls `GET /threads/{id}/messages?after=<last id>` for open threads and `GET /me/inbox-summary`.

## Connection

- Endpoint: `ws://localhost:8080/ws` (STOMP 1.2). Authenticated by the same `SESSION` cookie as REST.
- Heartbeats: 20s both ways. A client that misses two is dropped.
- Frames above 8 KB are rejected. Slow consumers are dropped, not buffered without limit.

## Server → client (subscribe)

| Destination                | Payload                                                         | When                                                       |
| -------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `/user/queue/messages`     | `Message` (from openapi.yaml)                                   | A message arrives in one of my threads                     |
| `/user/queue/threads`      | `ThreadSummary`                                                 | A thread changes folder, is accepted, or gets a new message |
| `/user/queue/inbox`        | `InboxSummary`                                                  | My unread counts change                                    |
| `/user/queue/receipts`     | `{ threadId, readerId, upTo }`                                  | The other person reads (Chats only)                        |
| `/user/queue/typing`       | `{ threadId, personId }`                                        | The other person is typing (not stored)                    |

Ignored Glows and blocked people never produce events.

## Client → server (send)

| Destination   | Payload        | Notes                                          |
| ------------- | -------------- | ---------------------------------------------- |
| `/app/typing` | `{ threadId }` | At most once every 3s per thread; not stored.  |

Sending messages goes through REST (`POST /threads/{id}/messages`), so retries, validation and rate limits live in one place.

## Later

- Live-tag broadcast per coarse H3 cell: `/topic/cells/{h3r6}` with coarse events only.
- Web Push when the app is closed (`PUT /me/push-subscription`).
