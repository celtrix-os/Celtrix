# MERN Turborepo Template

A monorepo MERN setup managed by Turborepo.

## Structure

```
.
├── package.json          # root with workspaces and turbo scripts
├── turbo.json            # Turborepo pipeline config
└── apps
    ├── client            # React + Vite frontend (App.jsx, assets/react.svg, strict mode)
    └── server            # Express API backend (server.js, health route)
```

## Scripts

From the root:

- `npm run dev` – Runs client and server in parallel via Turborepo
- `npm run build` – Builds all apps
- `npm run lint` – Lints all workspaces
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

If `MONGO_URI` is omitted, the server will start without a DB connection (scaffold-safe behavior).

## Error Handling

The server includes basic 404 and 500 handlers. Extend these in `server.js` as needed.

## Recommended Next Additions

- Add a shared `packages/` workspace for types/utilities
- Add Tailwind or UI lib to client
- Add tests (Vitest + React Testing Library, Supertest for API)
- Add Dockerfile for deployment

## Customization

Add linting, testing, shared packages, or environment configuration as needed.
