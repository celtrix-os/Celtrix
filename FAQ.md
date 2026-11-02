## Frequently Asked Questions

### What is Celtrix?

Celtrix is a CLI that generates a full-stack web app that already runs. You pick each layer (frontend, backend, runtime, database, ORM), or a ready-made preset, and Celtrix creates the project, connects the pieces and writes a `CELTRIX_SETUP.md` guide that explains how to run it.

---

### How is Celtrix different from other scaffolding tools?

Most scaffolders either generate one fixed stack or create a single app and leave the wiring to you. Celtrix lets you choose every layer independently, and then connects them: the API talks to the database through a shared package, a single root `.env` configures everything, and the generated app includes a working example feature (`/api/health` and `/api/users`) you can build on.

---

### Which technologies are supported?

In the **custom stack**:

* **Language:** TypeScript, JavaScript
* **Frontend:** React Router, Next.js, Nuxt, TanStack Start, Astro, SolidStart
* **Backend:** Express, Hono, Fastify, or none (frontend only)
* **Runtime:** Node.js or Bun, for the API
* **Database:** PostgreSQL, MySQL, MongoDB, SQLite
* **Database provider:** Supabase (PostgreSQL), MongoDB Atlas, Docker (PostgreSQL, MySQL, MongoDB) or a local server
* **ORM:** Prisma (all databases), Mongoose (MongoDB only)
* **Package manager:** npm, pnpm, yarn, bun

The proxy from the web app to the API, the typed API client and the live status screen are generated for the React Router frontend. The other frontends are created exactly as their own CLIs produce them, inside the same monorepo.

---

### Does Celtrix include preset templates?

Yes:

* MERN
* MEAN
* MEVN
* MERN + Tailwind + Authentication
* MEAN + Tailwind + Authentication
* MEVN + Tailwind + Authentication
* React + Tailwind + Firebase
* Next.js
* Hono + Prisma + React

For a MERN app without any stack prompts, run `npx celtrix mern-js my-app` or `npx celtrix mern-ts my-app`.

---

### Do I need to install Celtrix globally?

No. Run it directly:

```bash
npx celtrix my-app
```

---

### Can Celtrix run my database for me?

Yes. Choose **Docker** as the database provider (available for PostgreSQL, MySQL and MongoDB). Celtrix writes a `docker-compose.yml` and adds `db:up` / `db:down` scripts, and the `DATABASE_URL` in `.env.example` already matches the container. `npm run db:up` starts the database and waits until it's ready.

If the database port is already in use on your machine, set `DB_PORT` in `.env` and use the same port in `DATABASE_URL`.

---

### What do I need to configure after generating a project?

Copy `.env.example` to `.env` at the project root. It lists every variable the generated code reads, with comments. With the Docker provider the values already work. With Supabase, Atlas or a local server, fill in your own connection details. `CELTRIX_SETUP.md` in the generated project lists the exact steps for your stack.

---

### Does Celtrix work with AI coding assistants?

Celtrix itself makes no AI calls. It's designed to be the step before your assistant: generate and run the app first, then point the assistant at `CELTRIX_SETUP.md`, `celtrix.config.json` and the example users feature, and ask it to build new features following the same patterns.

---

### Are generated projects production-ready?

They're a working, structured starting point, not a finished deployment. Generated projects don't include a deployment setup, CI or a test runner. Add the ones that fit your hosting and workflow.

---

### Can I customize the generated project?

Yes. Once generated, the project is entirely yours. There is no runtime dependency on Celtrix, so you can change the architecture, dependencies and code freely.

---

### Can I use Celtrix for commercial projects?

Yes. Celtrix is open source under the [MIT License](./LICENSE), which allows personal and commercial use.

---

### What are the system requirements?

* **Node.js 20.19+ or 22.12+.** The Vite versions Celtrix installs require it.
* **npm, pnpm, yarn or bun** as the package manager.
* **Docker**, if you choose Docker as the database provider.
* **Bun**, if you choose Bun as the runtime.

Celtrix installs the project dependencies your stack needs.

---

### How can I contribute to Celtrix?

Contributions are welcome. See the **[Contributing Guide](./CONTRIBUTING.md)** for local setup and the pull request workflow. Run `npm test` for the unit tests and `npm run test:e2e` (requires Docker) to scaffold, build and run a real app.

---

### How do I add a new framework, template, or integration?

Custom-stack layers live in `utils/customGenerators/` (one generator per layer) and the wizard prompts in `prompts/web-parts/`. Preset templates are in `templates/`. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and open an issue to discuss larger additions before starting a pull request.

---

### How do I report bugs or request new features?

* **Bugs:** open a [bug report](https://github.com/celtrix-os/Celtrix/issues/new?template=bug_report.md) with your stack choices, the steps to reproduce and the error output. Running with `--verbose` prints the full error.
* **Features:** open a [feature request](https://github.com/celtrix-os/Celtrix/issues/new?template=feature_request.md) or start a thread in [Discussions](https://github.com/celtrix-os/Celtrix/discussions).

---

### Where can I get support?

Ask in [GitHub Discussions](https://github.com/celtrix-os/Celtrix/discussions) or open an [issue](https://github.com/celtrix-os/Celtrix/issues).
