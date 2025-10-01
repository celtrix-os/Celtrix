<div align="center">
  <img width="250" height="250" alt="Untitled design" src="https://github.com/user-attachments/assets/14739e9b-fecf-4cdd-afbb-4d18d30f1b0b" />
  
  # Celtrix

  **Setup web apps in seconds, not hours, with your preferred stack**
  
  [![npm version](https://img.shields.io/npm/v/celtrix.svg)](https://www.npmjs.com/package/celtrix)
  [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
  [![Downloads](https://img.shields.io/npm/dm/celtrix.svg)](https://www.npmjs.com/package/celtrix)
  
</div>

---

## ✨ Features

### 🎯 **Multiple Stack Options**
Choose from **7+ popular stacks** including MERN, MEAN, T3, Angular+Tailwind, and more!

<div align="center">
  <img width="455" height="537" alt="Celtrix Stack Selection Demo" src="https://github.com/user-attachments/assets/7b6a30be-1e34-443e-a906-8c167230c238" />
</div>

### 🌐 **Language Flexibility**
Pick your preferred programming languages and frameworks to match your workflow.

<div align="center">
  <img width="578" height="361" alt="Celtrix Language Selection" src="https://github.com/user-attachments/assets/3f8c775a-b747-4eb1-a22d-c1f236276934" />
</div>

### 🛠️ **Ready-to-Go Setup**
- ✅ **ESLint** configuration included
- ✅ **Sample components** and boilerplate code
- ✅ **API setup** with best practices
- ✅ **Automatic dependency installation**
- ✅ **Modern development tools** pre-configured

---

## 🚀 Quick Start

No global installation needed! Get started instantly:

```bash
npx celtrix my-awesome-app
```

That's it! Follow the interactive prompts to customize your project.

---

## 📦 What You Get

- **Production-ready** project structure
- **Modern tooling** and best practices
- **Responsive** starter templates
- **Clean code** architecture
- **Documentation** and examples

---

## 🤝 Contributing

We love contributions! Please feel free to:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests
- ⭐ Star this repository


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

<div align="center">
  
  **Made with ❤️ by [Celtrix Team](https://github.com/celtrix-os)**
  
  ### ⭐ Star us on GitHub — it motivates us a lot!
  
</div>
