<div style="text-align: center">
  <p align="center">
    <img width="3144" height="1056" alt="lop" src="https://github.com/user-attachments/assets/2a784007-1f76-4c9e-b8be-fd1bdc3c09c6" />
    <br><br>
   <i> Celtrix is a modern web-app scaffolder where you can Setup web apps in seconds, not hours, with your preferred stack.</i>
  </p>
</div>
<div align="center">

  [![npm version](https://img.shields.io/npm/v/celtrix.svg)](https://www.npmjs.com/package/celtrix)
  ![npm](https://img.shields.io/npm/dt/celtrix)
  [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
  [![Discord](https://img.shields.io/badge/Discord-Join%20Chat-7289da?logo=discord&logoColor=white)](https://discord.gg/GkDcAErQbD)

  
</div>


# Features


### **Multiple Stack Options**
- Run ```npx celtrix``` to instantly create projects with your favorite stack.
- Choose from **MERN, MEAN, MEVN, Next.js, or Hono setups**.
- Choose your own **preferred language**.
- Includes ready-made variants like Tailwind + Auth or Firebase integration.
- Simple, colorful, and interactive terminal experience.
- Built for developers who want fast, clean, and modern project scaffolding.


---

### **Ready-to-Go Setup**
-  **ESLint** configuration included
-  **Sample components** and boilerplate code
-  **API setup** with best practices
-  **Automatic dependency installation**
-  **Modern development tools** pre-configured

---

# Quick Start

No global installation needed! Get started instantly:

```bash
npx celtrix my-app
```

That's it! Follow the interactive prompts to customize your project.

---

# FAQ

You can now find the full list of FAQs here: [FAQ.md](./FAQ.md)

---

# What You Get

- **Production-ready** project structure
- **Modern tooling** and best practices
- **Responsive** starter templates
- **Clean code** architecture
- **Documentation** and examples

---

# Analytics

<div align="center">
  
![Alt](https://repobeats.axiom.co/api/embed/a7eb78008e8600eecc1e03ef4a546cf9104411dc.svg "Repobeats analytics image")

</div>

---

# Star History

<div align="center">
  <h3>📈 Watch our journey grow!</h3>
  <p><em>See how our community has grown over time</em></p>
  <br>
  
  <a href="https://star-history.com/#celtrix-os/Celtrix&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=celtrix-os/Celtrix&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=celtrix-os/Celtrix&type=Date&theme=light" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=celtrix-os/Celtrix&type=Date&theme=light" width="600" />
    </picture>
  </a>
  
  <br>
  <p><small>📊 <a href="https://star-history.com/#celtrix-os/Celtrix&Date">View interactive chart</a></small></p>
</div>

---

# Contributing

We love contributions! Please feel free to:

- Report bugs
- Suggest new features or ideas
- Submit pull requests
- Star this repository

## 🛠️ Local Development Setup (For Contributors)

If you’d like to contribute to **Celtrix** — a CLI tool for quickly creating web apps with your preferred stack — here’s how you can set it up and run it locally on your machine 👇

### ✅ Prerequisites

Make sure you have these installed before you start:

- **Node.js** – v16 or higher  
- **npm** – (comes with Node)  
- **Git**  

Check your versions:

```bash
node -v
npm -v
```

### 📦 1. Fork & Clone the Repository

Start by forking the repo and cloning it locally:

```bash
git clone https://github.com/<your-username>/Celtrix.git
cd Celtrix
```

*(replace `<your-username>` with your GitHub account)*

### 📁 2. Install Dependencies

Install all required packages with:

```bash
npm install
```

### 🔗 3. Link the CLI Globally

Link the local CLI version to your global environment. This lets you use `celtrix` as a command while working on it:

```bash
npm link
```

✅ Now you can run `celtrix` anywhere in your terminal and it will use **your local dev version** instead of the published npm package.

### ▶️ 4. Run the CLI from Source

After linking, try generating a test app to confirm everything is working:

```bash
celtrix my-test-app
```

This should scaffold a new MERN project using your local code.

### 🧪 5. Testing Your Changes

- Make code changes inside the `bin/`, `commands/`, `utils/`, or `templates/` directories.  
- Run the CLI again (`celtrix my-app`) to test your changes immediately.  
- If you modify module paths or add new dependencies, re-run:

```bash
npm install
npm link
```

> Optional: If test scripts exist in the future, run `npm test` to verify your changes.

### 🚀 6. Publishing (Maintainers Only)

If you’re a maintainer and want to publish a new version:

```bash
npm run release:patch   # or release:minor / release:major
```

This will bump the version and publish the package to npm.

### 🛠️ Troubleshooting

- **Command not found:** Run `npm link` again or restart your terminal.  
- **Permission errors:** Try using `sudo npm link` (on macOS/Linux).  
- **CLI not updating:** Unlink and re-link to refresh the global reference:

```bash
npm unlink -g celtrix
npm link
```

✅ **That’s it!** You’re now ready to contribute to Celtrix and improve the CLI for everyone 💪


---
# Our Contributors

Thanks goes to these wonderful people:  

<br/>

<div align="center">
  <a href="https://github.com/celtrix-os/celtrix/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=celtrix-os/celtrix" />
  </a>
</div>

<br/>


<div align="center">

<p><strong>Made with ❤️ by <a href="https://github.com/celtrix-os">Celtrix Team</a></strong></p>

<h3>⭐ Star us on GitHub — it motivates us a lot!</h3>

</div>

