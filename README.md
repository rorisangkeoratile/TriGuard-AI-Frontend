# TriGuard AI: frontend

The web app for TriGuard AI. Staff forward a suspicious voice note or message, see the risk and the reasons, then confirm the request by calling back a trusted number before any payment is released.

React + Vite + React Router. Requires Node.js 20 or newer.

```
npm install
cp .env.example .env    # set VITE_API_URL to where the backend runs
npm run dev             # http://localhost:5173
npm test                # unit tests (Vitest)
npm run build
```

The backend (FastAPI) is a separate project. Every endpoint, object and rule the frontend relies on is in [docs/API.md](docs/API.md). In development, Vite forwards `/api` to `VITE_API_URL`, so the session cookie works without CORS. In production, serve the built `dist/` folder and the API from the same domain, with `/api` routed to the backend.

## Pages

| Route | Page |
|---|---|
| `/` | Home page with Register and Log in |
| `/register`, `/login` | Register a store, log in. Only approved devices get in |
| `/app` | Overview: this month's numbers and recent checks |
| `/app/check` | New check: upload a voice note or paste a message, plus three yes/no payment questions |
| `/app/checks/:id` | Result: risk level, reasons, which guards ran, call-back and release or block |
| `/app/checks` | History with filters |
| `/app/contacts` | Trusted contacts and voiceprints (with consent) |
| `/app/team` | Staff accounts (the owner adds and removes them) |
| `/app/security` | Approve devices, block a lost or stolen one (signed out within seconds), set the payment PIN needed to release payments |

Each browser keeps a random device key, sent with log in and register. A store owner's first device is approved automatically; every other device waits for the owner's approval.

## Folders

| Folder | What it holds |
|---|---|
| `src/api/` | `client.js` (fetch wrapper, errors) and `index.js` (one function per endpoint) |
| `src/auth/` | Session state, login, logout, protected routes |
| `src/pages/` | Public pages; `src/pages/app/` holds the dashboard |
| `src/components/ui.jsx` | Badges, form fields, alerts |
| `src/lib/` | Formatting and validation helpers, data-loading hook |
| `src/styles/app.css` | All styles and the colour tokens |
