# CLI Customization Options

## Overview
Issue #53 implementation - This feature adds comprehensive customization options to the Celtrix CLI, allowing users to configure their projects with advanced settings during the scaffolding process.

## Features

### 🎨 Customization Options

When creating a new project, users can now enable customization mode to access the following options:

#### 1. **Port Configuration**
- **Server Port**: Configure the default server port (default: 5000)
- **Client Port**: Configure the default client port (default: 3000)

#### 2. **Git Initialization**
- Automatically initialize a Git repository
- Creates a comprehensive `.gitignore` file with sensible defaults

#### 3. **Docker Configuration**
- Include Docker setup files (for supported stacks)
- Available for: MERN, MEAN, MEVN, Hono, and their variations

#### 4. **Code Formatting Setup**
- **ESLint + Prettier**: Full linting and formatting setup
- **ESLint only**: Just linting
- **None**: Skip code quality tools

#### 5. **Additional Features**
Users can select multiple additional features:
- **API Documentation (Swagger)**: Adds Swagger/OpenAPI documentation setup
- **Environment Variables**: Creates `.env.example` template with common variables
- **VS Code Settings**: Adds workspace settings and recommended extensions
- **Pre-commit Hooks (Husky)**: Sets up Husky with lint-staged
- **GitHub Actions CI/CD**: Creates basic CI/CD workflow

## Usage

### Interactive Mode

1. Run Celtrix CLI:
```bash
npx celtrix
```

2. Follow the prompts:
   - Choose your stack
   - Choose your language
   - Choose package manager
   - **NEW**: Answer "Yes" to customization prompt
   - Configure your options

### Example Flow

```bash
$ npx celtrix

# After standard prompts...

? 🎨 Would you like to customize your project configuration? (y/N) Y

? 🔌 Server port: 8000
? 🔌 Client port: 5173
? 📦 Initialize Git repository? Yes
? 🐳 Include Docker configuration? Yes
? ✨ Code formatting setup: ESLint + Prettier
? 🚀 Select additional features: 
  ◉ API Documentation (Swagger)
  ◉ Environment variables (.env template)
  ◉ VS Code settings
  ◉ Pre-commit hooks (Husky)
  ◯ GitHub Actions CI/CD
```

## What Gets Generated

### With Git Initialization
- `.git` repository
- `.gitignore` with Node.js defaults

### With Environment Template
- `.env.example` file with:
  - Server configuration
  - Database connection strings
  - JWT secrets placeholder
  - CORS configuration
  - Optional email/API keys sections

### With VS Code Settings
- `.vscode/settings.json`:
  - Format on save
  - ESLint auto-fix
  - File exclusions
- `.vscode/extensions.json`:
  - Recommended extensions list

### With GitHub Actions
- `.github/workflows/ci.yml`:
  - Matrix testing (Node 18 & 20)
  - Automated tests
  - Build verification

### With Husky
- Pre-commit hooks configuration
- Lint-staged setup for automatic linting

### With Swagger
- `swagger.js` configuration file
- API documentation route setup
- Dependencies added to package.json

## Benefits

1. **Time Savings**: Set up common configurations instantly
2. **Best Practices**: Follows industry standards and conventions
3. **Consistency**: Ensures uniform project structure across teams
4. **Flexibility**: Enable only what you need
5. **Developer Experience**: Better tooling out of the box

## Technical Details

### Files Modified
- `index.js`: Added customization prompts
- `utils/customization.js`: New utility for applying customizations
- `utils/project.js`: Integrated customization handler

### New Dependencies (when selected)
- `swagger-jsdoc` & `swagger-ui-express` (for Swagger)
- `husky` & `lint-staged` (for pre-commit hooks)
- `eslint` & `prettier` (for code formatting)

## Backward Compatibility

This feature is **fully backward compatible**:
- Default behavior unchanged (customization disabled by default)
- Existing templates work as before
- No breaking changes to current API

## Future Enhancements

Potential additions for future versions:
- Database selection (MongoDB, PostgreSQL, MySQL)
- Authentication provider selection
- State management library selection (Redux, Zustand, etc.)
- Testing framework selection (Jest, Vitest, etc.)
- Deployment target configuration (Vercel, Netlify, AWS, etc.)

## Contributing

To add new customization options:

1. Add prompt in `index.js` `askAdvancedOptions()` function
2. Implement handler in `utils/customization.js`
3. Update configuration display in `utils/project.js`
4. Add tests
5. Update this documentation

## Example Output

After successful customization:

```
╭─────────────────────────────────────────────────╮
│                                                 │
│        📋 Project Configuration                 │
│                                                 │
│   🌐 Stack:  mern                              │
│   📦 Project Name:  my-awesome-app             │
│   📖 Language:  typescript                      │
│   📦 Package Manager:  pnpm                     │
│   🎨 Customizations:  Enabled                   │
│   🔌 Server Port:  8000                         │
│   🔌 Client Port:  5173                         │
│   📦 Git:  Yes                                  │
│   🐳 Docker:  Yes                               │
│   🚀 Features:  swagger, env-template, vscode-  │
│                settings                          │
│                                                 │
╰─────────────────────────────────────────────────╯

🎨 Applying customizations...
✅ Git repository initialized
✅ Environment template created
✅ VS Code settings created
✅ Swagger documentation setup added
✅ Ports updated (Server: 8000, Client: 5173)
✅ Customizations applied successfully!
```

## Issue Reference

This feature implements: [#53 - CLI interaction - implement customization option](https://github.com/celtrix-os/Celtrix/issues/53)

## Author

Implemented as part of the V2 Enhancement milestone for Celtrix.
