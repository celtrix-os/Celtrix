# MERN Turborepo Template Smoke Test

Manual steps to verify the template works after scaffolding:

1. Scaffold project:
   ```
   npx celtrix test-monorepo
   # choose: MERN (Turborepo)
   # choose: JavaScript
   ```
2. Install dependencies:
   ```
   cd test-monorepo
   npm install
   ```
3. Run dev:
   ```
   npm run dev
   ```
4. Expect:
   - React client on http://localhost:5173 showing heading
   - API server on http://localhost:4000/api/health returns `{ status: 'ok', service: 'mern-turbo-server' }`

If both succeed, template is healthy.
