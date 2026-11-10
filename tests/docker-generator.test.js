import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateDocker } from "../utils/customGenerators/dockerGenerator.js";

function createProject(databaseType) {
  const projectPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "celtrix-docker-")
  );

  fs.writeFileSync(
    path.join(projectPath, "package.json"),
    JSON.stringify({
      name: "test-app",
      version: "1.0.0",
      scripts: {
        dev: "vite",
        test: "node --test",
      },
    }, null, 2)
  );

  return {
    projectPath,
    context: {
      projectPath,
      projectName: "test-app",
      config: {
        database: {
          type: databaseType,
          provider: "docker",
        },
      },
    },
  };
}

test("generates the correct Docker Compose configuration for each database", async (t) => {
  const cases = [
    {
      type: "postgres",
      image: "postgres:17-alpine",
      port: 5432,
      database: "POSTGRES_DB: test_app",
      healthcheck: "pg_isready -U postgres -d test_app",
      volume: "/var/lib/postgresql/data",
    },
    {
      type: "mysql",
      image: "mysql:8.4",
      port: 3306,
      database: "MYSQL_DATABASE: test_app",
      healthcheck: "mysqladmin",
      volume: "/var/lib/mysql",
    },
    {
      type: "mongodb",
      image: "mongo:7",
      port: 27017,
      database: "--replSet",
      healthcheck: "rs.initiate",
      volume: "/data/db",
    },
  ];

  for (const item of cases) {
    await t.test(item.type, async (t) => {
      const { projectPath, context } = createProject(item.type);

      t.after(() => {
        fs.rmSync(projectPath, { recursive: true, force: true });
      });

      await generateDocker(context);

      const compose = fs.readFileSync(
        path.join(projectPath, "docker-compose.yml"),
        "utf-8"
      );

      const packageJson = JSON.parse(
        fs.readFileSync(
          path.join(projectPath, "package.json"),
          "utf-8"
        )
      );

      assert.ok(compose.includes(`image: ${item.image}`));
      assert.ok(compose.includes(item.database));
      assert.ok(compose.includes(item.healthcheck));
      assert.ok(compose.includes(item.volume));
      assert.ok(
        compose.includes(`127.0.0.1:\${DB_PORT:-${item.port}}:${item.port}`)
      );

      assert.equal(
        packageJson.scripts["db:up"],
        "docker compose up -d --wait"
      );

      assert.equal(
        packageJson.scripts["db:down"],
        "docker compose down"
      );

      // Existing package scripts must not be removed.
      assert.equal(packageJson.scripts.dev, "vite");
      assert.equal(packageJson.scripts.test, "node --test");
    });
  }
});

test("rejects unsupported Docker database types", async (t) => {
  const { projectPath, context } = createProject("sqlite");

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await assert.rejects(
    generateDocker(context),
    /Docker is not supported for database type: sqlite/
  );
});