# s3_tester frontend

React + TypeScript (Vite) interface for s3_tester. See the [root README](../README.md) for what the tool does and the backend API contract.

```bash
npm install
npm run dev        # sample data from the built-in mock
npm run build      # type-check and build to dist/
npm run lint
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_USE_MOCK` | `true` | Set to `false` to call the real backend. |
| `VITE_API_URL` | `/api` | Base URL of the backend API. |
| `BACKEND_URL` | `http://localhost:8000` | Where the dev server proxies `/api` requests. |

Everything the UI needs from the backend goes through `src/api/client.ts`, and every response shape is defined in `src/api/types.ts`. To change the contract, change the types first; TypeScript will point to every screen that needs updating.
