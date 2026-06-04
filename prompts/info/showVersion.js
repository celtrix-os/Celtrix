import chalk from "chalk";
import { getVersion } from "./getVersion.js";

export function showVersion() {
  const version = getVersion();
  console.log(`${chalk.cyanBright('Celtrix')} ${chalk.gray('v')}${chalk.greenBright(version)}`);
}