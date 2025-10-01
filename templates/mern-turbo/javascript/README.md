# MERN Turborepo Template

A monorepo MERN setup managed by Turborepo.

## Structure

```
.
├── package.json          # root with workspaces and turbo scripts
├── turbo.json            # Turborepo pipeline config
└── apps
    ├── client            # React + Vite frontend
    └── server            # Express API backend
```

## Scripts

From the root:

- `npm run dev` – Runs client and server in parallel via Turborepo
- `npm run build` – Builds all apps (currently placeholder)

## Next Steps After Scaffolding

```
cd <project-name>
npm install
npm run dev
```

Visit:
- Client: http://localhost:5173
- Server: http://localhost:4000/api/health

## Customization

Add linting, testing, shared packages, or environment configuration as needed.
