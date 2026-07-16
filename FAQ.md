## Frequently Asked Questions

### What is Celtrix?

Celtrix is a production-ready full-stack application scaffolder that lets you compose your own technology stack or choose from curated preset templates.

---

### How is Celtrix different from other scaffolding tools?

Most scaffolding tools generate a single predefined stack.

Celtrix lets you choose each layer of your application independently, including the frontend, backend, runtime, database, ORM, API layer, authentication provider, and developer tooling.

---

### Which technologies are currently supported?

Celtrix currently supports:

* **Frontend:** React Router, Next.js, Nuxt, TanStack Start, Astro, SvelteKit, SolidStart
* **Backend:** Fastify, Hono, Express, Convex
* **Runtime:** Node.js, Bun
* **Database:** PostgreSQL, MySQL, SQLite, MongoDB
* **ORM:** Drizzle, Prisma
* **API:** REST, tRPC, oRPC
* **Authentication:** Better Auth, Clerk

Support for additional technologies is continuously being added.

---

### Does Celtrix include preset templates?

Yes.

Celtrix includes production-ready preset templates such as:

* MERN
* MEAN
* MEVN
* MERN + Tailwind + Authentication
* MEAN + Tailwind + Authentication
* MEVN + Tailwind + Authentication
* React + Tailwind + Firebase
* Next.js
* Hono + Prisma + React

---

### Do I need to install Celtrix globally?

No.

Run Celtrix directly using:

```bash
npx celtrix my-app
```

No global installation is required.

---

### Are generated projects production-ready?

Celtrix generates projects using modern conventions and best practices, providing a strong production-ready foundation.

Depending on your application's requirements, you may still need to configure deployment, infrastructure, monitoring, and environment-specific settings.

---

### Can I customize the generated project?

Yes.

Once generated, the project is entirely yours. You can modify the architecture, dependencies, styling, configuration, and source code without restriction.

---

### Can I use Celtrix for commercial projects?

Yes.

Celtrix is open source and licensed under the ISC License, allowing both personal and commercial use under the terms of the license.

---

### How can I contribute to Celtrix?

Contributions are welcome.

Please see the **[Developer & Contributor Guide](./CONTRIBUTING.md)** for local setup instructions, development workflow, and contribution guidelines.

---

### How do I add a new framework, template, or integration?

New technologies can be added by implementing the corresponding template and generator logic.

Please follow the contribution guidelines in **CONTRIBUTING.md** before opening a Pull Request.

---

### How do I report bugs or request new features?

Please open a GitHub Issue with:

* A clear description of the problem
* Steps to reproduce
* Expected and actual behavior
* Relevant logs or screenshots (if applicable)

Feature requests are also welcome through GitHub Issues.

---

### What are the system requirements?

You only need:

* Node.js
* npm (or another compatible package manager)

Celtrix will install the project dependencies required by your selected stack.

---

### Where can I get support?

If you have questions, encounter issues, or want to suggest improvements, please use the GitHub Issues or GitHub Discussions section of the repository.
