<div align="center">

<img src="https://github.com/user-attachments/assets/2a784007-1f76-4c9e-b8be-fd1bdc3c09c6" alt="Celtrix" width="520" />

### Set up your web app first. Then build it with AI.

Celtrix is a CLI that generates a full-stack web app that **already runs**: frontend, API and database,<br />
connected and configured, with a guide that explains how to run it.

[![npm version](https://img.shields.io/npm/v/celtrix?color=4ade80&label=npm)](https://www.npmjs.com/package/celtrix)
[![npm downloads](https://img.shields.io/npm/dm/celtrix?color=4ade80)](https://www.npmjs.com/package/celtrix)
[![GitHub stars](https://img.shields.io/github/stars/celtrix-os/Celtrix?color=4ade80)](https://github.com/celtrix-os/Celtrix)
[![License: MIT](https://img.shields.io/github/license/celtrix-os/Celtrix?color=4ade80)](./LICENSE)

[Quick start](#quick-start) · [What you get](#what-you-get) · [Generated project](#the-generated-project) · [Build with AI](#building-with-ai) · [Contributing](#contributing)

</div>

```bash
npx celtrix my-app
```

---

## Why Celtrix

Every new web app starts with the same hour of glue work: create the frontend, create the API, pick an ORM, write the env loading, get the database running, make the three talk to each other. None of it is your product, and all of it has to be right before your product can start.

AI coding assistants made features fast, but they did not make this part reliable. Ask one to set up a project and you often get:

- **Stale setup.** Commands, config formats and package versions remembered from older code.
- **Pieces that don't connect.** Wrong ports, missing proxy, CORS errors, an ORM that can't find `DATABASE_URL`.
- **A new architecture every session.** Nothing stable for the next change to stay consistent with.
- **Context spent on boilerplate.** Tokens and review time go to config instead of features.

Celtrix does the setup **deterministically**. The same choices always produce the same project, created with the frameworks' own CLIs and wired together by generators covered by an end-to-end test that builds and runs a real app. You, or your AI assistant, start from a working app with one complete example feature to build on.

> Celtrix is a scaffolder, not an AI tool. It makes no AI calls, and what it generates is plain code you own, with no runtime dependency on Celtrix.

---

## Contents

- [Quick start](#quick-start)
- [What you get](#what-you-get)
- [The generated project](#the-generated-project)
- [Building with AI](#building-with-ai)
- [Supported stacks](#supported-stacks)
- [CLI reference](#cli-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Quick start

**Requirements:** Node.js 20.19+ or 22.12+ (required by the Vite versions Celtrix installs). You also need [Docker](https://docs.docker.com/get-docker/) if you want Celtrix to run your database, and [Bun](https://bun.sh) if you pick it as the runtime.

```bash
npx celtrix my-app
```

Choose **Custom Stack** and answer seven short steps. Backspace goes back to the previous step. An abridged run:

```text
$ npx celtrix my-app
? Choose your stack: ⚡ Custom Stack

── Customise your tech stack ──

? [1/7] Select a language: TypeScript
? [2/7] Select a frontend framework: React Router
? [3/7] Select a backend framework: Express
? [4/7] Select a runtime environment: Node.js
? [5/7] Select a database: PostgreSQL
? Select a postgres provider: Docker
? [6/7] Select an ORM: Prisma
? [7/7] Proceed with this configuration? Continue
? Choose a package manager: npm
? Do you want to install dependencies? Yes
```

When it finishes, Celtrix prints the next steps for the stack you picked:

```text
👉 Next Steps:

   1. cd my-app
   2. cp .env.example .env
   3. npm run db:up   # start the database in Docker
   4. npm run db:push   # create the database tables
   5. npm run dev

   📖 Read my-app/CELTRIX_SETUP.md for the full guide to set up and run your app.
```

Run them and open http://localhost:5173:

<div align="center">
  <img src=".github/assets/stack-status.png" alt="The generated app's welcome page, showing the API and database as up and a list of users read from PostgreSQL" width="560" />
  <br />
  <sub>A freshly generated React Router + Express + PostgreSQL app. The status panel is live: the users come from the database through the API.</sub>
</div>

---

## What you get

<table>
  <tr>
    <td width="50%" valign="top">
      <h4>A stack that's already connected</h4>
      The web app proxies <code>/api</code> to the server, and the server reaches the database through a shared <code>@repo/database</code> package, all in a Turborepo monorepo.
    </td>
    <td width="50%" valign="top">
      <h4>One complete example feature</h4>
      <code>GET /api/health</code> reports API and database status. <code>GET</code> and <code>POST /api/users</code> list and create users, returning <code>400</code> for invalid input and <code>409</code> for duplicates.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>A database you can actually run</h4>
      Pick <b>Docker</b> as the provider and get a healthchecked <code>docker-compose.yml</code> for PostgreSQL, MySQL or MongoDB. <code>db:up</code> waits until it's ready, and <code>DATABASE_URL</code> already matches the container.
    </td>
    <td valign="top">
      <h4>Configuration in one place</h4>
      A single <code>.env.example</code> at the root lists every variable the generated code reads, with comments. The API and the ORM CLI read the same root <code>.env</code>, and so does Vite with React Router.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>A setup guide for your exact stack</h4>
      <code>CELTRIX_SETUP.md</code> walks through env setup, database, schema and dev commands for the choices you made. Your own <code>README.md</code> is never overwritten.
    </td>
    <td valign="top">
      <h4>Official tools, current versions</h4>
      Frontends come from their own CLIs: <code>create-vite</code>, <code>create-next-app</code>, <code>nuxi</code>, <code>create astro</code> and <code>@tanstack/cli</code>. You get their current defaults, not a template frozen months ago.
    </td>
  </tr>
</table>

---

## The generated project

A fullstack custom project (here React Router + Express + PostgreSQL via Docker + Prisma, in TypeScript) looks like this:

```text
my-app/
├── apps/
│   ├── api/                      # Express, Hono or Fastify API
│   │   └── src/
│   │       ├── env.ts            # loads the root .env
│   │       └── index.ts          # /api/health and /api/users
│   └── web/                      # Vite + React app
│       ├── src/
│       │   ├── App.tsx           # welcome page with the live status screen
│       │   ├── components/StackStatus.tsx
│       │   └── lib/api.ts        # typed client for the API
│       └── vite.config.ts        # proxies /api to the API, reads the root .env
├── packages/
│   ├── database/                 # @repo/database, shared by the API
│   │   ├── prisma/schema.prisma  # User model
│   │   └── src/index.ts          # db client, checkConnection(), users helpers
│   └── tsconfig/                 # shared TypeScript config
├── .env.example                  # every variable the code reads
├── docker-compose.yml            # only with the Docker provider
├── CELTRIX_SETUP.md              # how to set up and run this project
├── celtrix.config.json           # the stack you chose
├── turbo.json
└── package.json                  # dev, build and db:* scripts
```

### How the pieces connect

```mermaid
flowchart LR
  Browser --> Web["apps/web<br/>Vite dev server :5173"]
  Web -- "proxies /api" --> API["apps/api<br/>API server :3001"]
  API -- "imports @repo/database" --> DB["packages/database<br/>Prisma or Mongoose"]
  DB --> Engine[("PostgreSQL · MySQL<br/>MongoDB · SQLite")]
  Env[".env at the repo root"] -.-> API
  Env -.-> DB
  Env -.-> Web
```

A frontend-only project (no backend) is a single app at the project root, exactly as the framework's CLI creates it, plus `CELTRIX_SETUP.md` and `celtrix.config.json`.

The proxy, typed API client and status screen are added for the **React Router** frontend. With the other frontends you get the same monorepo, API and database package, with the frontend exactly as its own CLI creates it.

### Environment variables

Copy `.env.example` to `.env`. Which variables appear depends on your choices:

| Variable | When | Purpose |
| :--- | :--- | :--- |
| `PORT` | always (with a backend) | API port, `3001` by default |
| `CORS_ORIGIN` | always (with a backend) | Origin allowed to call the API directly |
| `DATABASE_URL` | with a database | Connection string. Prefilled for Docker and local providers |
| `DB_PORT` | Docker provider | Host port for the container, if the default is taken |
| `DIRECT_URL` | Supabase | Session pooler URL that Prisma uses for migrations |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Supabase | Server-side Supabase client |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase + React Router | Browser Supabase client |

With the **Docker** provider, `.env.example` already contains working values, so `cp .env.example .env` is all you need. With Supabase, Atlas or a local server, fill in your own connection details. `CELTRIX_SETUP.md` says where to find them.

### Scripts

Run these from the project root:

| Script | What it does |
| :--- | :--- |
| `npm run dev` | Starts the web app and the API together (Turborepo) |
| `npm run build` | Type-checks the API and builds the web app into `apps/web/dist` |
| `npm run db:up` / `db:down` | Starts (and waits for) or stops the Docker database |
| `npm run db:push` | Syncs the Prisma schema to the database |
| `npm run db:migrate` | Creates and applies a Prisma migration |
| `npm run db:generate` | Regenerates the Prisma client |
| `npm run db:studio` | Opens Prisma Studio |

`db:up`/`db:down` exist with the Docker provider, and the other `db:*` scripts with Prisma. Mongoose needs no schema step, because it creates its collections at runtime. With yarn, pnpm or bun, use the same script names with your package manager.

> **Production:** the API runs with `tsx`, or Bun if you chose it (`npm run start -w apps/api`), and the web build is a static bundle in `apps/web/dist`. Generated projects don't include a deployment setup or a test runner yet. Add the ones that fit where you deploy.

---

## Building with AI

Celtrix is designed to be the step **before** your AI assistant, so it starts from a known-good app instead of an empty folder.

1. **Generate and run the app first.** When the status screen shows `api ok` and `database up`, the whole stack is proven. Any bug after that comes from a change, not the setup.
2. **Point your assistant at the context.** `CELTRIX_SETUP.md` explains how the project runs, and `celtrix.config.json` states the stack. The users feature is the reference pattern: the `/api/users` routes in `apps/api`, the `users` helpers in `packages/database` and `StackStatus` in `apps/web`.
3. **Ask for features, not foundations.** For example:

```text
Read CELTRIX_SETUP.md and celtrix.config.json. Add a `posts` resource
(title, body, author → users) following the same pattern as `users`:
Prisma model, database helpers, API routes with the same validation and
error handling, and a page in the web app.
```

```text
Write tests for /api/users covering create, list, an invalid email (400)
and a duplicate email (409).
```

The assistant extends patterns that already work instead of inventing new ones, and you review a focused diff instead of a whole new architecture.

---

## Supported stacks

### Custom stack

| Layer | Options |
| :--- | :--- |
| **Language** | TypeScript, JavaScript |
| **Frontend** | React Router, Next.js, Nuxt, TanStack Start, Astro, SolidStart |
| **Backend** | Express, Hono, Fastify, or none for a frontend-only app |
| **Runtime** | Node.js or Bun, for the API |
| **Database** | PostgreSQL, MySQL, MongoDB, SQLite |
| **ORM** | Prisma (all databases), Mongoose (MongoDB) |
| **Package manager** | npm, pnpm, yarn, bun |

Database providers:

| Database | Providers |
| :--- | :--- |
| PostgreSQL | Supabase, Docker, local |
| MySQL | Docker, local |
| MongoDB | MongoDB Atlas, Docker, local |
| SQLite | local file |

### Preset stacks

Ready-made templates for when you want a classic stack in one go: **MERN**, **MEAN** and **MEVN** (each also with Tailwind + Auth), **React + Tailwind + Firebase**, **Next.js** and **Hono**. Presets let you choose Node.js or Bun as the runtime.

Skip the prompts for a MERN app:

```bash
npx celtrix mern-js my-app   # JavaScript
npx celtrix mern-ts my-app   # TypeScript
```

---

## CLI reference

```text
npx celtrix [project-name] [options]
npx celtrix mern-js|mern-ts [project-name]
```

| Option | Description |
| :--- | :--- |
| `--help`, `-h` | Show help, including every stack and framework |
| `--version`, `-v` | Show the installed version |
| `--verbose` | Print full error details if scaffolding fails |

No global install is needed.

---

## Troubleshooting

<details>
<summary><b><code>db:up</code> fails because the port is already allocated</b></summary>

A database is already running on that port, often a locally installed PostgreSQL or MySQL. Set a free port in `.env` and use the same port in `DATABASE_URL`:

```bash
DB_PORT=5433
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/my_app"
```

</details>

<details>
<summary><b><code>db:up</code> says it cannot connect to the Docker daemon</b></summary>

Docker isn't running. Start Docker Desktop (or the Docker service) and run `npm run db:up` again.

</details>

<details>
<summary><b>The status screen shows <code>database down</code></b></summary>

The API is running but can't reach the database. In that state `/api/health` returns `503`. Check that the database is running (`npm run db:up` for Docker), that `DATABASE_URL` in `.env` is correct, and that you ran `npm run db:push` with Prisma.

</details>

<details>
<summary><b>Supabase: which connection string goes where?</b></summary>

In the Supabase dashboard under **Connect → ORMs**, use the transaction pooler string (port `6543`) as `DATABASE_URL` and the session pooler string (port `5432`) as `DIRECT_URL`. Prisma uses the direct one for migrations.

</details>

More answers are in the [FAQ](./FAQ.md).

---

## Contributing

Contributions of every size are welcome, from typo fixes to new stacks. A good first step is to generate a project, try it, and open an issue for anything that felt rough.

### Local setup

```bash
git clone https://github.com/celtrix-os/Celtrix.git
cd Celtrix
npm install
node index.js            # run the CLI from source
npm link                 # optional: use `celtrix` globally while developing
```

### Tests

```bash
npm test                 # unit tests (wizard navigation, welcome page)
npm run test:e2e         # scaffolds, builds and runs a real fullstack app; requires Docker
```

### Repository layout

```text
bin/            CLI entry point
prompts/        the interactive wizard (stack, language, frontend, backend, database…)
utils/          scaffolding: project.js (presets), customScaffolder.js (custom stack)
  customGenerators/   one generator per layer: frontend, backend, database, docker, env, wiring
templates/      preset stack templates, the welcome page, .gitignore files
tests/          unit tests
scripts/        e2e test, plus the maintainers' issue de-duplication tooling (see WORKFLOWS.md)
```

### Issues and pull requests

- **Found a bug?** [Open a bug report](https://github.com/celtrix-os/Celtrix/issues/new?template=bug_report.md) with your stack choices and the error output (`--verbose` helps).
- **Have an idea?** [Suggest a feature](https://github.com/celtrix-os/Celtrix/issues/new?template=feature_request.md) or start a thread in [Discussions](https://github.com/celtrix-os/Celtrix/discussions).
- **Ready to code?** Read [CONTRIBUTING.md](./CONTRIBUTING.md) for the branch and PR workflow.

Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

---

<div align="center">

If Celtrix saved you an evening of setup, a ⭐ on [GitHub](https://github.com/celtrix-os/Celtrix) helps other developers find it.

[MIT License](./LICENSE) · [celtrix.tech](https://celtrix.tech) · Made by the [Celtrix team](https://github.com/celtrix-os) and [contributors](https://github.com/celtrix-os/Celtrix/graphs/contributors)

</div>
