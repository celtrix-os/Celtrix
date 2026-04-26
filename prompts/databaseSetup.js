import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Maps each database type to its available provider/setup options.
 * Easily extensible — add a new DB type or provider by appending to the map.
 */
const SETUP_OPTIONS = {
  sqlite: [
    { label: "Turso",  color: chalk.cyanBright,    desc: "Edge-hosted distributed SQLite",  value: "turso" },
    { label: "Local",  color: chalk.gray,           desc: "Local file-based SQLite",         value: "local" },
  ],
  postgres: [
    { label: "Neon",      color: chalk.greenBright,    desc: "Serverless Postgres",             value: "neon"     },
    { label: "Supabase",  color: chalk.hex("#3FCF8E"),  desc: "Open-source Firebase alternative", value: "supabase" },
    { label: "Local",     color: chalk.gray,            desc: "Self-hosted PostgreSQL",          value: "local"    },
  ],
  mysql: [
    { label: "PlanetScale", color: chalk.yellowBright,  desc: "Serverless MySQL platform",       value: "planetscale" },
    { label: "Local",       color: chalk.gray,           desc: "Self-hosted MySQL",               value: "local"       },
  ],
  mongodb: [
    { label: "MongoDB Atlas", color: chalk.greenBright,  desc: "Cloud-hosted MongoDB",            value: "atlas" },
    { label: "Local",         color: chalk.gray,          desc: "Self-hosted MongoDB",             value: "local" },
  ],
};

/**
 * Prompts for database setup/provider based on the selected database type.
 * Only called when the user has selected a database (not "none").
 *
 * @param {string} databaseType - The chosen database type (sqlite, postgres, etc.).
 * @returns {Promise<{ provider: string }>}
 */
export async function askDatabaseSetup(databaseType) {
  const options = SETUP_OPTIONS[databaseType];

  // If no setup options exist for this DB type, default to "local"
  if (!options || options.length === 0) {
    return { provider: "local" };
  }

  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: chalk.bold(`Select a ${chalk.cyanBright(databaseType)} provider:`),
      choices: options.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: options[0].value,
    },
  ]);

  return { provider };
}
