# ConnectSphere — Frontend

A real-time social client for the [ConnectSphere backend](../connectsphere-backend). Built with **React + Vite + Tailwind**, with live chat, an AI-assisted composer, optimistic reactions, and a class-based dark mode.

## Stack

- **React 18** + **Vite 5** (fast dev server, optimized production build)
- **React Router 6** for routing
- **Tailwind CSS 3** (class-based dark mode, custom design tokens)
- **axios** for HTTP (in-memory access token + automatic refresh on 401)
- **socket.io-client** for real-time chat, typing, presence, and notifications
- **lucide-react** for icons

## Getting started

```bash
# 1. Install
npm install

# 2. Configure the API URL
cp .env.example .env
#   then edit .env if your backend isn't on http://localhost:5000

# 3. Run (needs the backend running)
npm run dev          # http://localhost:5173
```

> The frontend talks to the backend over HTTP **and** a Socket.IO connection, and relies on the refresh-token cookie the backend sets. Start the backend first (`npm run dev` in `connectsphere-backend`) so both the API and websocket are reachable.

### Environment

| Variable       | Default                       | Purpose                              |
| -------------- | ----------------------------- | ------------------------------------ |
| `VITE_API_URL` | `http://localhost:5000/api`   | Base URL of the backend REST API     |

The Socket.IO origin is derived automatically by stripping `/api` from `VITE_API_URL`.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Production build to `dist/`          |
| `npm run preview` | Preview the production build locally |

## What's included

- **Auth** — register, login, session restore via refresh cookie, protected routes
- **Feed** — infinite scroll, optimistic 6-emoji reactions, share, pin, delete
- **AI composer** — generate captions + hashtags in five tones (calls `/ai/caption`)
- **Profiles** — header, follow/unfollow, inline profile + avatar editing, a user's posts
- **Post detail** — single post view with comments
- **Real-time chat** — conversation list, live messages, typing indicators, read receipts, image attachments, presence dots, message history pagination
- **Notifications** — live bell with unread badge, fed by `notification:new` socket events
- **Dark mode** — system-aware, toggleable, persisted

## Project structure

```
src/
  lib/         api client (axios + token refresh), formatters, constants
  context/     Theme, Toast, Auth, Socket providers
  hooks/       useSocketEvent, useFeed
  components/
    ui/        Button, Input, Avatar, Spinner, Modal, EmptyState
    layout/    AppLayout, AuthShell, ProtectedRoute, ThemeToggle
    post/      Composer, PostCard, ReactionBar, PostFeed
    chat/      ConversationList, ChatWindow, MessageBubble, NewChatModal
    Brand, NotificationBell, RichText, SuggestionsCard
  pages/       Feed, Explore, Profile, Post, Messages, NotFound, auth/{Login,Register}
  App.jsx      routes
  main.jsx     provider tree
```

## Design

- **Type:** Space Grotesk (display) + Inter (body)
- **Color:** iris/indigo `brand` primary, `coral` reserved for reactions and alerts, calm slate neutrals
- **Signature:** the AI-assist "spark" on the composer — the one bold element; everything else stays quiet
- Responsive to mobile, visible keyboard focus, and reduced-motion respected

## Deploying to Vercel

1. Push this folder to a Git repo and import it in Vercel.
2. Framework preset: **Vite**. Build command `npm run build`, output dir `dist`.
3. Set `VITE_API_URL` to your deployed backend URL (e.g. `https://your-api.onrender.com/api`).
4. On the **backend**, set `CLIENT_URL` to your Vercel URL so CORS + the refresh cookie work cross-origin.

## Notes & next steps

- Nested comment replies (the data model supports them) currently show a reply count; threaded reply UI is a natural next addition.
- Search, hashtag pages, stories, and an admin view are scoped for later phases.
