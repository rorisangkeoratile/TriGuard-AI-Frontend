# TriGuard-AI
An AI-powered cybersecurity application designed to help everyday South Africans identify potential AI-generated voices, faces and scam messages during digital interactions.

## Development

React + Vite. Requires Node.js 20 or newer.

```
npm install
npm run dev      # http://localhost:5173
npm test         # detection engine tests (Vitest)
npm run build
```

Copy `.env.example` to `.env`. `VITE_USE_MOCK=true` runs the detection engine in the browser with simulated voice and face scores; set it to `false` to send checks to the backend at `VITE_API_URL`. The API contract is documented in `src/services/detector.js`.

| Folder | What it holds |
|---|---|
| `src/engine/` | Detection engine: plain JavaScript with no React or DOM, so it can also run on a Node backend |
| `src/engine/lang/` | Scam phrases and common words for each official language (drafts until a native speaker reviews them) |
| `src/engine/__tests__/` | Tests, including a corpus of South African scam and genuine messages. Add new examples there |
| `src/services/detector.js` | Switch between the local engine (mock) and the backend API; documents every endpoint the backend must provide |
| `src/services/mockData.js` | Demo-only answers for services the phone can't do alone (link reputation, scam waves, bank account checks, breaches) |
| `src/simulator/` | The demo desk and simulated phone |
