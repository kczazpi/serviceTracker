# Service Tracker frontend

React 19 + Vite + TypeScript. Sign in or register, then log, edit and delete the hours worked per day,
browsing month by month.

## Run it

**Everything in Docker** (from the repo root): `docker compose up --build`, then open http://localhost:8080.
The `frontend` container serves the built app with nginx and forwards `/api` to the API container,
so the browser only ever talks to one origin and no CORS configuration is needed.

**Development with hot reload:**

1. Start the API and database: `docker compose up --build dotnet` (API on http://localhost:4001).
2. In this folder: `npm install`, then `npm run dev` and open http://localhost:5173.

Vite forwards `/api` to the API as well. Point it somewhere else with `API_URL=http://host:port npm run dev`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit/component tests (Vitest + Testing Library) |
| `npm run build` | Type-check and build into `dist/` |

## Notes

- The JWT is kept in `localStorage`. That is simple, but any script on the page can read it, so keep the app free of third-party scripts.
- The nginx setup in `nginx.conf` is the "same origin" deployment. The alternative is to host `dist/` elsewhere,
  set `VITE_API_BASE_URL` at build time and enable CORS on the API.
- The API container runs with `ASPNETCORE_ENVIRONMENT=Development` in compose; use real settings and a real
  signing key before exposing this anywhere.
