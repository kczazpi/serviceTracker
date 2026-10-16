# Service Tracker frontend

React 19 + Vite + TypeScript. Sign in or register, then log, edit and delete the hours worked per day,
browsing month by month.

## Run it

1. Start the API and database from the repo root: `docker compose up --build` (API on http://localhost:4001).
2. In this folder: `npm install`, then `npm run dev` and open http://localhost:5173.

In development Vite forwards `/api` to the API, so no CORS configuration is needed.
Point it somewhere else with `API_URL=http://host:port npm run dev`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit/component tests (Vitest + Testing Library) |
| `npm run build` | Type-check and build into `dist/` |

## Notes

- The JWT is kept in `localStorage`. That is simple, but any script on the page can read it, so keep the app free of third-party scripts.
- For a production deployment, serve `dist/` and `/api` from the same origin (reverse proxy), or set `VITE_API_BASE_URL`
  at build time and enable CORS on the API.
