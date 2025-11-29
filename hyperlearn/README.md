# HyperLearn — Interactive Coding Academy (Single-file React App)

This repo contains a single-file React application (`src/App.jsx`) implementing:
- Local `sign up` / `log in` (works using browser localStorage + WebCrypto SHA-256)
- Searchable tutorials with progress saved to localStorage
- Live code runner (sandboxed iframe) and editor
- Animations via Framer Motion
- Tailwind classes used (requires tailwind setup; included devDeps)

## Run locally
1. `npm install`
2. `npm run dev`
3. Open http://localhost:5173

This package is intentionally minimal so you can integrate into your own stack.
