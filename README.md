# People Performance UI

Vite + React shell. Independently deployable to the **same** EC2 as the HR dashboard,
mounted only at `/platform`.

## Production

| Surface | URL |
|---------|-----|
| Dashboard (separate repo) | https://performance.nextventures.io/ |
| **This app** | https://performance.nextventures.io/platform/ |
| **Platform API** | https://performance.nextventures.io/api/platform/* |

Same machine, same domain. nginx routes `/platform` → this UI and `/api/platform/` → a **standalone** platform API container (`:3002`). Dashboard stays on `/` and its own API on `:3001`. Dashboard rebuilds do not wipe platform login.

You can ship **millions of UI changes** from this repo alone. No dashboard redeploy, no DB env required for the SPA.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:8001.

```bash
cp .env.example .env   # optional; VITE_API_BASE_URL empty = same-origin /api
```

**Local sign-in:** Add both redirect URIs in the platform Google Cloud OAuth client:

- `https://performance.nextventures.io/api/platform/auth/google/callback`
- `http://localhost:8001/api/platform/auth/google/callback`

Vite proxies `/api` to production and sends `X-Forwarded-Host` so Google returns to localhost. Deploy platform API changes with `npm run deploy:platform-api`. For offline UI only, set `VITE_AUTH_MODE=local`.

## Deploy to EC2 `/platform` (from this repo)

One-time:

```bash
cp .env.deploy.example .env.deploy
# edit PERF_EC2_HOST + PERF_EC2_PEM if needed
```

Every release:

```bash
npm run deploy:ec2
```

That builds with `base: /platform/`, uploads to `/var/www/platform`, reloads nginx if needed.

API (own Docker service - safe from dashboard deploys):

```bash
npm run deploy:platform-api
```

**Not required for UI deploy:** `DB_*`, RDS, Revolut, encryption keys. Platform API reuses `DB_*` + `PLATFORM_*` from the host dashboard `.env` into its own container env.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local Vite (:8001) |
| `npm run build` | Production build (`/platform/` base) |
| `npm run deploy:ec2` | Build + ship UI to EC2 `/platform` |
| `npm run deploy:platform-api` | Ship standalone `/api/platform` Docker service |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
