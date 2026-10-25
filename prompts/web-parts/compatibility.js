/**
 * Technical Compatibility Rules for Celtrix Custom Stack.
 * Centralized business logic that defines which tools can coexist.
 */

/**
 * Returns compatible ORM options based on the chosen database.
 *
 * @param {string} databaseType - Chosen database type ('sqlite', 'postgres', 'mysql', 'mongodb', 'none').
 * @returns {string[]} Allowed ORM values.
 */
export function getCompatibleORMs(databaseType) {
  if (!databaseType || databaseType === "none") {
    return ["none"];
  }

  // Mongoose is MongoDB-only; Prisma supports every database engine Celtrix offers
  if (databaseType === "mongodb") {
    return ["prisma", "mongoose"];
  }

  return ["prisma"];
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
      return ["local"];
    case "postgres":
      return ["supabase", "docker", "local"];
    case "mysql":
      return ["docker", "local"];
    case "mongodb":
      return ["atlas", "docker", "local"];
    default:
      return [];
  }
}
