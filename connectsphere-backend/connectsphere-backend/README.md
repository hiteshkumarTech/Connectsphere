# ConnectSphere AI — Backend API

Production-grade REST + real-time backend for a social platform: authentication, a
social graph, posts with media, nested comments, emoji reactions, real-time
notifications over WebSockets, and AI features (caption generation, writing
assistant, content moderation).

This is **Phase 1 — the foundation**. It is fully runnable and deployable on its own.
The frontend (HTML/CSS/JS + Tailwind) and the real-time chat UI build on top of it next.

---

## Tech stack

- **Node.js + Express 4** (CommonJS)
- **MongoDB + Mongoose 8**
- **JWT auth** — short-lived access tokens + rotating refresh tokens (httpOnly cookie)
- **Socket.IO** — authenticated real-time notifications & presence
- **Cloudinary** — image storage (optional; text posts work without it)
- **OpenAI-compatible AI** — works with OpenAI, Gemini's compat endpoint, OpenRouter, Groq, etc.
- Security: `helmet`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`, `cors`, bcrypt

## Architecture

```
src/
  config/        env loading + validation, DB, Cloudinary
  models/        User, Post, Comment, Follow, Reaction, Notification
  middleware/    auth (protect/optionalAuth/restrictTo), error, validate, rateLimiter, upload
  validators/    express-validator chains per resource
  controllers/   request handlers (auth, user, post, comment, ai)
  services/      ai.service, notification.service
  socket/        Socket.IO server, auth handshake, presence, emit helpers
  utils/         ApiError, asyncHandler, token, sendEmail, cloudinaryUpload, pagination, text
  routes/        one router per resource, mounted under /api
  app.js         express app (middleware + routes + error handling)
  server.js      http server + socket init + graceful shutdown
```

**Key design decisions**

- **Reactions are a polymorphic collection**, not arrays on posts. One `Reaction`
  document (`user` + `targetType` + `target` + `type`) powers both likes and the six
  emoji reactions on posts *and* comments. This avoids unbounded-array growth and a
  unique compound index guarantees one reaction per user per target.
- **Refresh-token rotation with reuse detection.** Refresh tokens are stored *hashed*
  in a per-user `sessions` array (multi-device). On refresh the used token is rotated;
  if a valid-but-unknown token appears, every session is revoked (theft response).
- **Maintained counters** (`followersCount`, `reactionsCount`, `commentsCount`, …) for
  O(1) reads; reaction/comment counts are recomputed with `countDocuments` on write to
  stay accurate.
- **Consistent response envelope:** `{ success, data, message }` on success,
  `{ success, message, errors? }` on failure, all funneled through one error handler.

## Response shape

```jsonc
// success
{ "success": true, "data": { ... }, "message": "optional" }
// error
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }
```

---

## Getting started

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env
#   then fill in MONGODB_URI and the two JWT secrets (required).
#   Cloudinary + AI keys are optional — the server runs without them.

# 3. run
npm run dev      # nodemon (development)
npm start        # production
```

Server boots at `http://localhost:5000`. Health check: `GET /api/health`.

> **Email in development:** if `SMTP_HOST` is empty, verification and password-reset
> links are printed to the server console instead of being emailed — so you can test
> the full flow with zero email setup.

### Environment variables

| Var | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | yes | long random strings |
| `CLIENT_URL` | recommended | frontend origin for CORS + cookies (default `http://localhost:5173`) |
| `CLOUDINARY_*` | optional | enables image uploads |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `AI_MODEL` | optional | enables AI endpoints |
| `AI_MODERATION` | optional | `true` to auto-moderate posts on creation |
| `SMTP_*` / `EMAIL_FROM` | optional | real email delivery |

---

## API reference

All routes are prefixed with `/api`. Protected routes need `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/register` | username, name, email, password | returns access token + sets refresh cookie |
| POST | `/login` | email, password | |
| POST | `/refresh` | — | uses refresh cookie; rotates it |
| POST | `/logout` | — | revokes current session |
| GET | `/verify-email/:token` | — | |
| POST | `/resend-verification` | — | auth |
| POST | `/forgot-password` | email | |
| POST | `/reset-password/:token` | password | |
| POST | `/change-password` | currentPassword, newPassword | auth |
| GET | `/me` | — | auth; current user |

### Users — `/api/users`
| Method | Path | Notes |
|---|---|---|
| GET | `/search?q=` | search by username/name |
| GET | `/suggestions` | auth; who-to-follow, scored by shared interests/skills |
| PATCH | `/me` | auth; update profile fields |
| PATCH | `/me/username` | auth |
| POST | `/me/avatar` | auth; multipart `image` |
| POST | `/me/cover` | auth; multipart `image` |
| GET | `/:username` | profile (+ isFollowing/isMe) |
| GET | `/:username/followers` · `/following` | paginated |
| POST/DELETE | `/:username/follow` | auth; follow / unfollow |

### Posts — `/api/posts`
| Method | Path | Notes |
|---|---|---|
| GET | `/feed` | auth; following-based, falls back to public for new users |
| GET | `/explore` | recent public posts |
| GET | `/hashtag/:tag` | posts by hashtag |
| GET | `/user/:username` | a user's posts (respects privacy/visibility) |
| POST | `/` | auth; multipart `images[]` (≤10) + `content`, `visibility` |
| GET | `/:id` | single post (increments views) |
| PATCH | `/:id` | auth; owner |
| DELETE | `/:id` | auth; owner/admin (cascades comments, reactions, media) |
| POST/DELETE | `/:id/react` | auth; body `{ type }` for one of 👍❤️🔥😂😮👏 |
| POST | `/:id/pin` | auth; owner toggle |
| POST | `/:id/share` | increments share count |
| GET | `/:postId/comments` | top-level comments |
| POST | `/:postId/comments` | auth; body `{ content, parent? }` |

### Comments — `/api/comments`
| Method | Path | Notes |
|---|---|---|
| GET | `/:commentId/replies` | paginated replies |
| PATCH / DELETE | `/:id` | auth; owner (delete also: post author/admin) |
| POST/DELETE | `/:id/react` | auth; reactions |

### AI — `/api/ai` (auth)
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/status` | — | `{ configured, model }` |
| POST | `/caption` | topic, tone?, count? | `{ captions[], hashtags[] }` |
| POST | `/improve` | text, action (grammar/tone/expand/rewrite) | `{ result }` |
| POST | `/moderate` | content | `{ flagged, categories, score, reason }` |

---

## Real-time (Socket.IO)

Connect with the access token in the handshake:

```js
import { io } from 'socket.io-client';
const socket = io(API_URL, { auth: { token: accessToken } });
socket.on('notification:new', ({ notification, unreadCount }) => { /* ... */ });
socket.on('presence:update', ({ userId, online }) => { /* ... */ });
```

Each user joins a private room `user:<id>`; notifications (follow, reaction, comment,
reply, mention) are pushed there as they happen.

---

## Deployment

- **Backend → Render:** Build `npm install`, Start `npm start`. Set all env vars in the
  dashboard. `trust proxy` is already enabled for secure cookies behind the proxy.
- **Database → MongoDB Atlas:** allow Render's egress (or `0.0.0.0/0` for a student
  project) and use the SRV connection string.
- **Frontend → Vercel:** set `CLIENT_URL` on the backend to the deployed frontend
  origin so CORS and the refresh cookie (`sameSite=None; Secure` in production) work.

---

### Chat & messaging — `/api/chat` (auth)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/unread` | — | total unread count for a global badge |
| GET | `/conversations` | — | conversation list, newest-activity first |
| POST | `/conversations` | `{ userId }` (DM) or `{ isGroup, participants[], name }` | get-or-create; DMs are deduped |
| GET | `/conversations/:id/messages` | — | paginated history (newest first) + read state |
| POST | `/conversations/:id/messages` | `content`, `replyTo?`, multipart `attachments[]` | send a message |
| POST | `/conversations/:id/read` | — | clear unread + emit read receipt |
| DELETE | `/conversations/:id` | — | clear thread for the current user only |
| POST | `/conversations/:id/leave` | — | leave a group |
| POST | `/conversations/:id/participants` | `userIds[]` | add members (group admins) |
| PATCH | `/messages/:id` | `content` | edit your message |
| DELETE | `/messages/:id` | — | soft-delete (sender / group admin / platform admin) |

**Chat design notes**

- **1:1 threads are deduplicated** via a deterministic `dmKey` (sorted member ids) with a
  unique sparse index, so opening a DM is an idempotent get-or-create. Group chats use the
  same `Conversation` model with `isGroup: true`.
- **Unread counts + read position live on the conversation** (per-member), so the
  conversation list renders with no extra queries. Read receipts are derived from each
  member\'s `lastReadAt` — no per-message write amplification.
- Messages are **soft-deleted** (`deleted: true`) so threads stay consistent and clients
  can show a "message deleted" placeholder; image attachments are removed from Cloudinary.

#### Real-time chat events (Socket.IO)

Client emits:

```js
socket.emit('conversation:join', { conversationId });   // verified server-side
socket.emit('conversation:leave', { conversationId });
socket.emit('typing:start', { conversationId });
socket.emit('typing:stop', { conversationId });
```

Server emits:

| Event | Payload | When |
|---|---|---|
| `message:new` | `{ conversationId, message }` | a message is sent |
| `message:edited` | `{ conversationId, message }` | a message is edited |
| `message:deleted` | `{ conversationId, messageId }` | a message is removed |
| `message:read` | `{ conversationId, userId, lastReadAt }` | someone reads a thread |
| `typing:start` / `typing:stop` | `{ conversationId, userId, username }` | relayed within the active thread |
| `conversation:new` | `{ conversation }` | you are added to a new conversation |
| `conversation:member_left` | `{ conversationId, userId }` | a member leaves a group |

Message/conversation events are delivered to every participant\'s private room (all their
devices). Typing indicators are relayed only inside the joined conversation room.


## What's next (Phase 2+)

- Frontend (Tailwind) + **chat UI** and notification center (the chat *backend* is included — see above)
- Stories, bookmarks, global search, trending feed
- Admin panel, reports/moderation queue, gamification

## License

MIT — built as a learning/portfolio project.
