import chalk from "chalk";
import { getVersion } from "./getVersion.js";
import { BOOLEAN_FLAGS, STACK_FLAGS } from "../../utils/cliFlags.js";
import { DATABASE_OPTIONS, getCompatibleORMs, getCompatibleProviders } from "../../utils/stackOptions.js";

const pad = (text, width) => text + " ".repeat(Math.max(1, width - text.length));

export function showHelp() {
  const version = getVersion();
  console.log(`${chalk.cyanBright.bold('Celtrix')} ${chalk.gray('v')}${chalk.greenBright(version)}`);
  console.log(chalk.gray('⚡ Setup Web-apps in seconds, not hours ⚡\n'));

  console.log(chalk.bold('Usage:'));
  console.log(`  ${chalk.cyan('npx celtrix')} ${chalk.gray('[project-name] [flags]')}`);
  console.log(`  ${chalk.cyan('npx celtrix')} ${chalk.gray('mern-js|mern-ts [project-name] [--runtime] [--pm]')}\n`);
  console.log(`  ${chalk.gray('[project-name]')}  A folder name, or "." for the current (empty) folder\n`);

  console.log(chalk.bold('Stack flags:'));
  for (const flag of STACK_FLAGS) {
    const note = flag.note ? chalk.gray(`  (${flag.note})`) : "";
    console.log(`  ${chalk.cyan(pad(`--${flag.name} <value>`, 22))}${flag.values.join(" | ")}${note}`);
  }

  console.log(chalk.bold('\n--db-provider and --orm by database:'));
  for (const { value: db } of DATABASE_OPTIONS.filter((opt) => opt.value !== "none")) {
    console.log(`  ${chalk.cyan(pad(db, 10))}${chalk.gray("provider:")} ${pad(getCompatibleProviders(db).join(" | "), 28)}${chalk.gray("orm:")} ${getCompatibleORMs(db).join(" | ")}`);
  }

  console.log(chalk.bold('\nOther flags:'));
  for (const flag of BOOLEAN_FLAGS) {
    const names = flag.short ? `-${flag.short}, --${flag.name}` : `--${flag.name}`;
    console.log(`  ${chalk.cyan(pad(names, 22))}${flag.description}`);
  }

  console.log(chalk.gray('\n  Any stack flag selects the custom stack. Values you leave out are asked for,'));
  console.log(chalk.gray('  or filled with defaults when --yes is given.\n'));

  console.log(chalk.bold('Examples:'));
  console.log(`  ${chalk.cyan('npx celtrix')}                ${chalk.gray('# Interactive mode')}`);
  console.log(`  ${chalk.cyan('npx celtrix my-app -y')}      ${chalk.gray('# Default custom stack, no prompts')}`);
  console.log(`  ${chalk.cyan('npx celtrix my-app --frontend astro --backend none --pm npm')}`);
  console.log(`  ${chalk.cyan('npx celtrix my-app --lang typescript --frontend nextjs --backend hono --runtime node \\')}`);
  console.log(`  ${chalk.cyan('    --db postgres --db-provider supabase --orm prisma --pm pnpm')}\n`);

  console.log(chalk.bold('Modes:'));
  console.log(`  ${chalk.magentaBright('Custom Stack')}     ${chalk.gray('Pick every piece of your stack interactively')}`);
  console.log(`  ${chalk.gray('Preset Stacks')}    ${chalk.gray('Choose a pre-configured full-stack template')}`);

  console.log(chalk.bold('\nPreset Stacks:'));
  console.log(`  ${chalk.blueBright('MERN')}             ${chalk.gray('MongoDB + Express + React + Node.js')}`);
  console.log(`  ${chalk.redBright('MEAN')}             ${chalk.gray('MongoDB + Express + Angular + Node.js')}`);
  console.log(`  ${chalk.cyanBright('MEVN')}             ${chalk.gray('MongoDB + Express + Vue + Node.js')}`);
  console.log(`  ${chalk.greenBright('MERN+Auth')}        ${chalk.gray('MERN with Tailwind & Authentication')}`);
  console.log(`  ${chalk.magentaBright('React+Firebase')}   ${chalk.gray('React + Tailwind + Firebase')}`);
  console.log(`  ${chalk.whiteBright('Next.js')}          ${chalk.gray('Full-stack React framework')}`);
  console.log(`  ${chalk.magentaBright('Hono')}             ${chalk.gray('Hono + Prisma + React')}`);

  console.log(chalk.gray('\nFor more information, visit: https://github.com/celtrix-os/Celtrix'));
}
