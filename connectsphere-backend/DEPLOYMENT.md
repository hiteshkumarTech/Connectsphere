# Deploying ConnectSphere

This deploys the full stack for free:

| Piece              | Host                | Cost |
| ------------------ | ------------------- | ---- |
| Backend API + socket | **Render** (web service) | Free |
| Frontend (React/Vite) | **Vercel**          | Free |
| Database           | **MongoDB Atlas**   | Free (M0) |
| Image uploads      | Cloudinary          | Free (optional) |
| AI caption assist  | Any OpenAI-compatible key | Optional |

### How it's wired (and why)

The refresh token is an **httpOnly cookie**. If the frontend (`*.vercel.app`) and backend (`*.onrender.com`) are on different sites, that cookie is *cross-site*, and Safari/iOS will silently drop it — so you'd get logged out on every refresh. To avoid that, the included `vercel.json` **proxies `/api` through Vercel** to your backend, which makes the cookie first-party and works in every browser. The realtime socket can't go through that proxy (Vercel rewrites don't carry WebSockets), so it connects **directly** to the backend using the in-memory access token (no cookie needed). One env var, `VITE_SOCKET_URL`, points it there.

> Prefer the dead-simple route instead? See **[Simpler alternative](#simpler-alternative-no-proxy)** at the bottom — one caveat is Safari.

---

## 0. Prerequisites

- The **backend** and **frontend** each pushed to a GitHub repo (two repos, or a monorepo — see the `rootDir` note in `render.yaml`).
- Free accounts: [MongoDB Atlas](https://www.mongodb.com/atlas), [Render](https://render.com), [Vercel](https://vercel.com). Optional: [Cloudinary](https://cloudinary.com) and an AI provider.

## 1. MongoDB Atlas (database)

1. Create a free **M0** cluster.
2. **Database Access** → add a user with a username + password (save them).
3. **Network Access** → Add IP Address → **0.0.0.0/0** (Render's free tier uses rotating IPs, so allow all).
4. **Connect → Drivers** → copy the connection string. Replace `<password>`, and add the database name `connectsphere` before the `?`:
   ```
   mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/connectsphere?retryWrites=true&w=majority
   ```
   This is your `MONGODB_URI`.

## 2. Cloudinary (optional — image uploads)

Create an account → **Dashboard** → copy **Cloud name**, **API Key**, **API Secret**. Skip this and the app still runs; posting images and changing avatars are just disabled until it's set.

## 3. AI key (optional — caption assist + moderation)

Any OpenAI-compatible endpoint works (OpenAI, OpenRouter, Groq, Google's OpenAI-compat endpoint). Set `OPENAI_API_KEY`, plus `OPENAI_BASE_URL` and `AI_MODEL` if you're not using OpenAI directly.

## 4. Deploy the backend → Render

**Blueprint (recommended — `render.yaml` is included):**

1. Push the backend repo to GitHub (`render.yaml` at its root).
2. Render → **New → Blueprint** → connect the repo. Render reads `render.yaml`, creates a free web service, and **auto-generates the two JWT secrets**.
3. Fill in the values it prompts for: `MONGODB_URI`, and `CLIENT_URL` (your Vercel URL — you'll have it after step 5; set a placeholder for now, e.g. `https://example.vercel.app`, and update it in step 6). Add the Cloudinary / OpenAI vars if you're using them.
4. Deploy. The health check hits `/api/health`.
5. Copy your backend URL, e.g. `https://connectsphere-api.onrender.com`.

**Manual (alternative):** New → Web Service → Runtime **Node**, Build `npm install`, Start `npm start`, Plan **Free**, Health check `/api/health`. Add the same env vars (use long random strings for the two JWT secrets; `PORT` is set by Render automatically).

> **Free-tier note:** the service sleeps after ~15 min idle. The first request after it sleeps takes ~30–60s to wake — normal for a portfolio app.

## 5. Deploy the frontend → Vercel

1. In the frontend repo, open **`vercel.json`** and replace `https://YOUR-BACKEND.onrender.com` with your real Render URL (in the `/api` rewrite). Commit.
2. Vercel → **Add New → Project** → import the repo. Framework preset **Vite** is auto-detected (Build `npm run build`, Output `dist`).
3. **Settings → Environment Variables**, add:
   - `VITE_API_URL` = `/api`
   - `VITE_SOCKET_URL` = `https://your-backend.onrender.com`
4. Deploy. Copy your frontend URL, e.g. `https://connectsphere.vercel.app`.

## 6. Connect the two

1. On **Render**, set `CLIENT_URL` to your **exact** Vercel origin (no trailing slash), e.g. `https://connectsphere.vercel.app`, and save — Render redeploys. This is what lets the realtime socket's CORS accept your frontend.
2. If you edited `vercel.json` or env vars after the first Vercel deploy, trigger a redeploy.

## 7. Verify

- Open the Vercel URL → **register**. (Without SMTP set, the verification link is just printed to Render's logs; the app works unverified.)
- **Hard-refresh** the page — you should stay signed in. ✅ (proves the proxied cookie is first-party)
- Open **Messages** in two different accounts/browsers — live chat + typing should work. ✅ (proves the socket reached Render)
- Post with an image (needs Cloudinary) and try the **✨ AI** button (needs an AI key).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Logged out on every refresh / 401 loop | `VITE_API_URL` must be `/api`, and the `/api` rewrite in `vercel.json` must point to your Render URL. In the Network tab, `/api/auth/refresh` should be a **200 from your-frontend.vercel.app**, not a CORS error. |
| No realtime (chat/typing dead) | `VITE_SOCKET_URL` must be your Render URL, **and** `CLIENT_URL` on Render must equal your Vercel origin exactly. |
| CORS error on `/api/*` | You're hitting Render directly instead of the proxy — set `VITE_API_URL=/api`. |
| Images won't upload | Cloudinary env vars missing on Render. |
| First load is slow | Render free tier waking from sleep (~30–60s). |

## Simpler alternative (no proxy)

If you'd rather not proxy:

- Set `VITE_API_URL=https://your-backend.onrender.com/api` (full URL), remove the `/api` rewrite from `vercel.json` (keep only the SPA fallback), and leave `VITE_SOCKET_URL` blank (it's derived from the API URL).
- Set `CLIENT_URL` on Render to your Vercel origin.
- **Caveat:** the auth cookie is now cross-site. Chrome, Edge, and Firefox are fine; **iOS/macOS Safari may drop it**, logging users out on refresh. The proxy setup above avoids this.

## Production-grade (custom domain)

For a real product, put both behind one registrable domain — e.g. `app.example.com` (frontend) and `api.example.com` (backend). The cookie is then first-party with `SameSite=Lax` and works everywhere. Point `CLIENT_URL` and `VITE_API_URL` at those domains.
