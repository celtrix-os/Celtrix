# MERN Turborepo Template (TypeScript)

A monorepo MERN setup managed by Turborepo, using TypeScript for both client and server.

## Structure

```
.
├── package.json          # root with workspaces and turbo scripts
├── turbo.json            # Turborepo pipeline config
└── apps
    ├── client            # React + Vite + TS frontend
    └── server            # Express API backend (TS)
```

## Scripts

From the root:

- `npm run dev` – Runs client and server in parallel via Turborepo
- `npm run build` – Builds all apps
- `npm run dev --filter=client` – Run only client
- `npm run dev --filter=server` – Run only server

## Next Steps After Scaffolding

```
cd <project-name>
npm install
npm run dev
```

Visit:
- Client: http://localhost:5173
- Server: http://localhost:4000/api/health

## Environment Variables

Create a `.env` file in `apps/server/` based on `.env.example`:

```
PORT=4000
MONGO_URI=mongodb://localhost:27017/your_db
NODE_ENV=development
```

If `MONGO_URI` is omitted or placeholder, the server boots without a DB connection.

## TypeScript Layout

- `apps/client/tsconfig.json` uses project references to split concerns:
    - `tsconfig.app.json` – Browser code
    - `tsconfig.node.json` – Vite / tooling context
- Add a `tsconfig.base.json` at the monorepo root later for shared compiler settings.

## Error Handling & Health

The scaffold includes a `/api/health` endpoint and basic error handling you can extend with logging libraries.

## Recommended Next Additions

- Shared `packages/types` for API DTOs
- Add ESLint stricter rules & Prettier config
- Tailwind or UI framework integration
- Testing: Vitest + React Testing Library + Supertest
- Dockerfile / CI pipeline example

## Customization

Add linting, testing, shared packages, or environment configuration as needed.
