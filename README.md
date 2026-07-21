# People Performance UI

Vite + React shell for the People Performance app. Demo Google sign-in stores a
session in `sessionStorage`; wire a real IdP and set `VITE_API_BASE_URL` before
production.

## Run

```bash
npm install
npm run dev
```

Open **http://localhost:8001**.

Copy `.env.example` to `.env` if you need a backend origin:

```bash
cp .env.example .env
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite on port 8001 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Vitest unit + component tests |
| `npm run lint` | ESLint |
