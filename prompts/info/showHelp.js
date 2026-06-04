import chalk from "chalk";
import { getVersion } from "./getVersion.js";

export function showHelp() {
  const version = getVersion();
  console.log(`${chalk.cyanBright.bold('Celtrix')} ${chalk.gray('v')}${chalk.greenBright(version)}`);
  console.log(chalk.gray('⚡ Setup Web-apps in seconds, not hours ⚡\n'));

  console.log(chalk.bold('Usage:'));
  console.log(`  ${chalk.cyan('npx celtrix')} ${chalk.gray('[project-name]')} ${chalk.gray('[options]')}\n`);

  console.log(chalk.bold('Options:'));
  console.log(`  ${chalk.cyan('--version, -v')}     Show version number`);
  console.log(`  ${chalk.cyan('--help, -h')}        Show help information`);
  console.log(`  ${chalk.cyan('--verbose')}         Show detailed error output\n`);

  console.log(chalk.bold('Examples:'));
  console.log(`  ${chalk.cyan('npx celtrix')}                 ${chalk.gray('# Interactive mode')}`);
  console.log(`  ${chalk.cyan('npx celtrix my-app')}          ${chalk.gray('# Create project with name')}`);
  console.log(`  ${chalk.cyan('npx celtrix --version')}       ${chalk.gray('# Show version')}`);
  console.log(`  ${chalk.cyan('npx celtrix --help')}          ${chalk.gray('# Show this help')}\n`);

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

  console.log(chalk.bold('\nCustom Stack — Frontends:'));
  console.log(`  ${chalk.cyanBright('React Router')}     ${chalk.gray('React with file-based routing')}`);
  console.log(`  ${chalk.white('Next.js')}          ${chalk.gray('Full-stack React framework')}`);
  console.log(`  ${chalk.greenBright('Nuxt')}             ${chalk.gray('Full-stack Vue framework')}`);
  console.log(`  ${chalk.hex('#FF6200')('TanStack')}         ${chalk.gray('Type-safe routing & data fetching')}`);
  console.log(`  ${chalk.magentaBright('Astro')}            ${chalk.gray('Content-focused, island architecture')}`);
  console.log(`  ${chalk.redBright('SvelteKit')}        ${chalk.gray('Cybernetically enhanced web apps')}`);
  console.log(`  ${chalk.blueBright('SolidStart')}       ${chalk.gray('Fine-grained reactive UI framework')}`);

  console.log(chalk.bold('\nCustom Stack — Backends:'));
  console.log(`  ${chalk.hex('#FF6200')('Hono')}             ${chalk.gray('Ultrafast edge-ready web framework')}`);
  console.log(`  ${chalk.white('Fastify')}          ${chalk.gray('Fast & low-overhead Node.js framework')}`);
  console.log(`  ${chalk.yellowBright('Express')}          ${chalk.gray('Minimalist Node.js web framework')}`);
  console.log(`  ${chalk.magentaBright('Convex')}           ${chalk.gray('Reactive backend-as-a-service')}`);

  console.log(chalk.bold('\nSupported Runtimes:'));
  console.log(`  ${chalk.greenBright('Node.js')}          ${chalk.gray('The standard JavaScript runtime')}`);
  console.log(`  ${chalk.white('Bun')}              ${chalk.gray('Fast all-in-one JS runtime & toolkit')}`);

  console.log(chalk.gray('\nFor more information, visit: https://github.com/celtrix-os/Celtrix'));
}