@AGENTS.md

# bns-front local development

`bns-front` is the Next.js client for the `bns-back` Express API.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Start `bns-back` in its repository with `pnpm install`, `pnpm db:migrate`, and `pnpm dev`.
3. Run this app with `pnpm dev`.
4. Keep `NEXT_PUBLIC_API_URL=http://localhost:4000` for local development.

For deployed environments, set `NEXT_PUBLIC_API_URL` to the deployed bns-back HTTPS URL, without a trailing slash. The backend `CORS_ORIGIN` must include the bns-front origin.

## API conventions

- Use `lib/api-client.ts` for browser API requests.
- Keep API paths rooted at `/api`; the client prefixes them with `NEXT_PUBLIC_API_URL`.
- File uploads use `FormData` and the `file` field.
- Never commit `.env.local` or credentials.
