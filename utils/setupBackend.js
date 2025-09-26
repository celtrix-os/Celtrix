import { execSync } from "child_process";
import chalk from "chalk";
import path from "path";
import fs from "fs";

const removeLocks = (dir) => {
  ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"].forEach((file) => {
    const lockFile = path.join(dir, file);
    if (fs.existsSync(lockFile)) fs.rmSync(lockFile);
  });
};

export async function setupBackend(
  projectPath,
  backend,
  backendLang,
  database
) {
  if (backend === "None") return;

  const appsPath = path.join(projectPath, "apps");
  const backendPath = path.join(appsPath, "backend");
  fs.mkdirSync(backendPath);
  console.log(chalk.green(`\n📦 Setting up ${backend} backend...`));

  // EXPRESS
  if (backend === "Express.js") {
    const isTS = backendLang === "ts";
    const ext = isTS ? "ts" : "js";

    // package.json
    fs.writeFileSync(
      path.join(backendPath, "package.json"),
      JSON.stringify(
        {
          name: "backend",
          version: "1.0.0",
          private: true,
          scripts: {
            dev: isTS ? "ts-node-dev --respawn index.ts" : "node index.js",
          },
          dependencies: { express: "latest" },
          devDependencies: isTS
            ? {
                typescript: "latest",
                "ts-node-dev": "latest",
                "@types/express": "latest",
              }
            : {},
        },
        null,
        2
      )
    );

    // index.ts/js
    fs.writeFileSync(
      path.join(backendPath, `index.${ext}`),
      `import express from "express";

const app = express();
app.get("/", (req,res) => res.send("Hello from Express!"));
app.listen(3000, () => console.log("Server running on port 3000"));`
    );

    // tsconfig.json (for TS only)
    if (isTS) {
      fs.writeFileSync(
        path.join(backendPath, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2022",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              outDir: "./dist",
              rootDir: "./src",
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
              sourceMap: true,
              resolveJsonModule: true,
              baseUrl: "./src",
            },
            include: ["src/**/*.ts"],
            exclude: ["node_modules", "dist"],
          },
          null,
          2
        )
      );
    }
  }

  // NESTJS
  else if (backend === "NestJS") {
    execSync(`npx -y @nestjs/cli new backend --skip-install --skip-git`, {
      stdio: "inherit",
      cwd: appsPath,
    });
    removeLocks(path.join(appsPath, "backend"));
  }

  // KOA
  else if (backend === "Koa.js") {
    fs.writeFileSync(
      path.join(backendPath, "package.json"),
      JSON.stringify(
        {
          name: "backend",
          version: "1.0.0",
          private: true,
          scripts: { dev: "node index.js" },
          dependencies: { koa: "latest" },
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(backendPath, "index.js"),
      `import Koa from "koa";
const app = new Koa();
app.use(ctx => { ctx.body = "Hello from Koa!"; });
app.listen(3000, () => console.log("Server running on port 3000"));`
    );
  }

  // FASTIFY
  else if (backend === "Fastify") {
    fs.writeFileSync(
      path.join(backendPath, "package.json"),
      JSON.stringify(
        {
          name: "backend",
          version: "1.0.0",
          private: true,
          scripts: { dev: "node index.js" },
          dependencies: { fastify: "latest" },
        },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(backendPath, "index.js"),
      `import Fastify from "fastify";
const app = Fastify();
app.get("/", async () => ({ message: "Hello from Fastify!" }));
app.listen({ port: 3000 }, () => console.log("Server running on port 3000"));`
    );
  }

  // DATABASE
  if (database !== "None") {
    console.log(
      chalk.yellow(`\n🔌 Adding database dependencies for ${database}...`)
    );
    const backendPkgPath = path.join(backendPath, "package.json");
    const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, "utf-8"));

    if (database === "Postgres + Prisma") {
      backendPkg.dependencies = {
        ...backendPkg.dependencies,
        prisma: "latest",
        "@prisma/client": "latest",
        pg: "latest",
      };
    } else if (database === "MySQL + Prisma") {
      backendPkg.dependencies = {
        ...backendPkg.dependencies,
        prisma: "latest",
        "@prisma/client": "latest",
        mysql2: "latest",
      };
    } else if (database === "MongoDB + Mongoose") {
      backendPkg.dependencies = {
        ...backendPkg.dependencies,
        mongoose: "latest",
      };
    }

    fs.writeFileSync(backendPkgPath, JSON.stringify(backendPkg, null, 2));
  }
}
