import open from 'open';
import chalk from 'chalk';

const CELTRIX_SITE = 'https://celtrix-dev.netlify.app/';

export async function loginCommand() {
  console.log(chalk.cyan('\n🔐 Opening Celtrix login page...\n'));
  console.log(chalk.gray(`🌐 Visit: ${CELTRIX_SITE}`));
  console.log(chalk.gray('📋 Follow the instructions on the website to login.\n'));
  
  try {
    await open(CELTRIX_SITE);
    console.log(chalk.green('✅ Browser opened successfully!\n'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to open browser.'));
    console.log(chalk.yellow(`\nPlease manually visit: ${CELTRIX_SITE}\n`));
  }
}