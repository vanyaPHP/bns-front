# bns-front

Next.js UI for the BNS corporate portal. All data and business logic live in
[bns-back](https://github.com/vanyaPHP/bns-back) (Express + Neon Postgres + Vercel Blob).

## How it talks to the API

- The browser only calls same-origin `/api/*`; `next.config.ts` rewrites those requests to `BACKEND_URL`.
  The `bns_session` cookie therefore stays first-party on the frontend domain.
- Server components resolve the session through `lib/server-session.ts`, which forwards the cookie to `GET /api/auth/me`.

## Local development

1. Start bns-back on port 4000 (see its `CLAUDE.md`).
2. Copy `.env.example` to `.env.local` and adjust `BACKEND_URL` if needed.
3. `npm install && npm run dev`, then open http://localhost:3000.

## Deployment (Vercel)

Set `BACKEND_URL` to the production bns-back origin (no trailing slash). The build fails on Vercel when it is missing.
On bns-back, set `CORS_ORIGIN` to the frontend origin.
