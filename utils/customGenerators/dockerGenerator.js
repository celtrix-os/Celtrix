import fs from "fs-extra";
import path from "path";

/**
 * Runs the selected database in Docker for local development:
 *   docker-compose.yml  – one healthchecked "db" service with a persistent volume
 *   db:up / db:down     – root scripts that start (and wait for) / stop it
 *
 * The connection string written to .env.example comes from getDockerDatabaseUrl,
 * so the credentials in both files always match.
 */
export async function generateDocker(context) {
  const { type } = context.config.database;
  const dbName = getDatabaseName(context.projectName);

  fs.writeFileSync(path.join(context.projectPath, "docker-compose.yml"), getComposeFile(type, dbName));

  const rootPkgPath = path.join(context.projectPath, "package.json");
  const rootPkg = fs.readJsonSync(rootPkgPath);
  rootPkg.scripts = {
    ...rootPkg.scripts,
    // --wait returns once the healthcheck passes, so db:push can run right after
    "db:up": "docker compose up -d --wait",
    "db:down": "docker compose down",
  };
  fs.writeJsonSync(rootPkgPath, rootPkg, { spaces: 2 });
}

export function getDatabaseName(projectName) {
  return projectName.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function getDockerDatabasePort(type) {
  switch (type) {
    case "postgres": return 5432;
    case "mysql": return 3306;
    case "mongodb": return 27017;
    default:
      throw new Error(`Docker is not supported for database type: ${type}`);
  }
}

export function getDockerDatabaseUrl(type, dbName) {
  const port = getDockerDatabasePort(type);
  switch (type) {
    case "postgres":
      return `postgresql://postgres:postgres@localhost:${port}/${dbName}`;
    case "mysql":
      return `mysql://root:root@localhost:${port}/${dbName}`;
    case "mongodb":
      // The container is a single-node replica set; connect to it directly
      return `mongodb://localhost:${port}/${dbName}?directConnection=true`;
    default:
      throw new Error(`Docker is not supported for database type: ${type}`);
  }
}

function getComposeFile(type, dbName) {
  return `# Local development database. Start it with \`db:up\`, stop it with \`db:down\`.
# Data lives in the "db-data" volume; \`docker compose down -v\` deletes it.
# Port taken by a local install? Set DB_PORT in .env and use the same port in DATABASE_URL.
services:
  db:
${getService(type, dbName)}
    restart: unless-stopped
    volumes:
      - db-data:${getDataDir(type)}

volumes:
  db-data:
`;
}

function getService(type, dbName) {
  switch (type) {
    case "postgres":
      return `    image: postgres:17-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${dbName}
    ports:
      - "127.0.0.1:\${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ${dbName}"]
      interval: 5s
      timeout: 5s
      retries: 10`;
    case "mysql":
      return `    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: ${dbName}
    ports:
      - "127.0.0.1:\${DB_PORT:-3306}:3306"
    healthcheck:
      # Over TCP, so it only passes once the real server (not the init server) is up
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-uroot", "-proot"]
      interval: 5s
      timeout: 5s
      retries: 20`;
    case "mongodb":
      return `    image: mongo:7
    # Prisma needs a replica set for transactions, so run a single-node one
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "127.0.0.1:\${DB_PORT:-27017}:27017"
    healthcheck:
      # Initiates the replica set on first run and passes once this node is primary
      test: ["CMD-SHELL", "mongosh --quiet --eval \\"try { rs.status() } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] }) } if (!db.hello().isWritablePrimary) quit(1)\\""]
      interval: 5s
      timeout: 10s
      retries: 20
      start_period: 10s`;
    default:
      throw new Error(`Docker is not supported for database type: ${type}`);
  }
}

function getDataDir(type) {
  switch (type) {
    case "postgres": return "/var/lib/postgresql/data";
    case "mysql": return "/var/lib/mysql";
    case "mongodb": return "/data/db";
    default: return "/data";
  }
}
