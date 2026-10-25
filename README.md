# Celtrix

![Celtrix Banner](https://github.com/user-attachments/assets/2a784007-1f76-4c9e-b8be-fd1bdc3c09c6)

Celtrix is a modern web-app scaffolder. Set up full-stack web applications in seconds with your preferred technologies.

---

## 🚀 Features

Celtrix supports preset stacks for immediate scaffolding as well as a flexible custom wizard.

### 1. Preset Stacks
Scaffold ready-to-go, production-grade applications:

* **MERN** (MongoDB, Express, React, Node.js)
* **MEAN** (MongoDB, Express, Angular, Node.js)
* **MEVN** (MongoDB, Express, Vue, Node.js)
* **MERN / MEAN / MEVN + Tailwind + Auth** (Ready-to-go auth & styling)
* **React + Tailwind + Firebase** (Serverless starter)
* **Next.js** (Modern React framework setup)
* **Hono** (Hono, Prisma, React)

### 2. Custom Stack Options
Mix and match your tech stack interactively:

| Layer | Supported Technologies |
| :--- | :--- |
| **Frontend** | React Router, Next.js, Nuxt, TanStack, Astro, SolidStart |
| **Backend** | Hono, Fastify, Express, None (Frontend-only) |
| **Runtime** | Node.js, Bun |
| **Database** | PostgreSQL (Supabase, Docker or local), SQLite, MySQL (Docker or local), MongoDB (Atlas, Docker or local), None |
| **ORM** | Prisma, Mongoose (MongoDB only) |

---

## ⚡ Quick Start

No global installation is required. Run:

```bash
npx celtrix my-app
```

### Quick Templates
Scaffold a preset MERN template instantly:

```bash
npx celtrix mern-js my-app  # JavaScript
npx celtrix mern-ts my-app  # TypeScript
```

---

## 🛠️ Local Development

To contribute to Celtrix or run it locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/celtrix-os/Celtrix.git
   cd Celtrix
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the CLI:**
   ```bash
   node index.js
   ```
4. **Test globally:**
   ```bash
   npm link
   celtrix my-test-app
   ```

### Issue Database & Validation Scripts
If you are working on repository issues:
```bash
npm run validate            # Validate API keys (Pinecone, GitHub, Gemini)
npm run populate-issues     # Sync GitHub issues to vector database
npm run check-duplicates    # Scan database for duplicates
npm run debug-db            # Inspect database health & status
```

---

## 🤝 Contributing

We welcome all contributions! Please check out [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

---

<div align="center">
  <p>Made with ❤️ by the <a href="https://github.com/celtrix-os">Celtrix Team</a></p>
</div>
