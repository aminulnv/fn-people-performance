# People Performance UI

Vite + React shell. Independently deployable to the **same** EC2 as the HR dashboard,
mounted only at `/platform`.

## Production

| Surface | URL |
|---------|-----|
| Dashboard (separate repo) | https://performance.nextventures.io/ |
| **This app** | https://performance.nextventures.io/platform/ |

Same machine, same domain. nginx routes `/platform` → this build. Dashboard stays on `/`.

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

**Not required for deploy:** `DB_*`, RDS, Revolut, encryption keys. Those stay with the dashboard API until this platform has its own backend.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local Vite (:8001) |
| `npm run build` | Production build (`/platform/` base) |
| `npm run deploy:ec2` | Build + ship to EC2 `/platform` |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
