import chalk from "chalk";

/**
 * Technical Compatibility Rules for Celtrix Custom Stack.
 * Centralized business logic that defines which tools can coexist.
 */

/**
 * Returns compatible ORM options based on the chosen database and language.
 *
 * @param {string} databaseType - Chosen database type ('sqlite', 'postgres', 'mysql', 'mongodb', 'none').
 * @param {string} language - Chosen language ('javascript', 'typescript').
 * @returns {string[]} Allowed ORM values.
 */
export function getCompatibleORMs(databaseType, language) {
  if (!databaseType || databaseType === "none") {
    return ["none"];
  }

  // Drizzle constraints:
  // 1. JavaScript is not supported by Celtrix Drizzle generator (hardcoded TS syntax).
  // 2. MySQL is not supported by Celtrix Drizzle generator (hardcoded SQLite/Postgres drivers).
  // 3. MongoDB is NoSQL and unsupported by Drizzle.
  if (language === "javascript" || databaseType === "mysql" || databaseType === "mongodb") {
    return ["prisma"];
  }

  // Postgres and SQLite with TypeScript support both
  return ["drizzle", "prisma"];
}

/**
 * Returns compatible API options based on the chosen backend and language.
 *
 * @param {string} backend - Chosen backend framework ('hono', 'fastify', 'express', 'convex', 'none').
 * @param {string} language - Chosen language ('javascript', 'typescript').
 * @returns {string[]} Allowed API values.
 */
export function getCompatibleAPIs(backend, language) {
  if (!backend || backend === "none" || backend === "convex") {
    return ["none"];
  }

  // tRPC / oRPC require TypeScript compilation/types
  if (language === "javascript") {
    return ["none"];
  }

  return ["trpc", "orpc", "none"];
}

/**
 * Returns compatible Authentication options based on language, backend, and database selection.
 *
 * @param {string} backend - Chosen backend framework.
 * @param {string} language - Chosen language.
 * @param {string} databaseType - Chosen database engine.
 * @returns {string[]} Allowed Auth values.
 */
export function getCompatibleAuths(backend, language, databaseType) {
  const allowed = ["none", "clerk"];

  // Better Auth requirements:
  // 1. Must use TypeScript.
  // 2. Requires a running backend server.
  // 3. Requires a database connection.
  if (
    language === "typescript" &&
    backend &&
    backend !== "none" &&
    databaseType &&
    databaseType !== "none"
  ) {
    allowed.push("better-auth");
  }

  return allowed;
}

/**
 * Returns compatible database providers for a selected database engine.
 *
 * @param {string} databaseType - Chosen database engine.
 * @returns {string[]} Allowed provider values.
 */
export function getCompatibleProviders(databaseType) {
  switch (databaseType) {
    case "sqlite":
      return ["turso", "local"];
    case "postgres":
      return ["neon", "supabase", "local"];
    case "mysql":
      return ["planetscale", "local"];
    case "mongodb":
      return ["atlas", "local"];
    default:
      return [];
  }
}
