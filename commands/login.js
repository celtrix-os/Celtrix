import open from 'open';
import chalk from 'chalk';

const CELTRIX_SITE = 'https://github.com/login?client_id=Ov23liMDYiGI0v8UsV0v&return_to=%2Flogin%2Foauth%2Fauthorize%3Fclient_id%3DOv23liMDYiGI0v8UsV0v%26redirect_uri%3Dhttps%253A%252F%252Fceltrix-dev.netlify.app%252Fapi%252Fauth%252Fcallback%26scope%3Drepo%2Buser';

export async function loginCommand() {
  console.log(chalk.cyan(''));
  console.log(chalk.gray(`🌐 Login to Celtrix: ` ) + chalk.blue(`${CELTRIX_SITE}`));
  
  try {
    await open(CELTRIX_SITE);
  } catch (error) {
    console.error(chalk.red('❌ Failed to open browser.'));
    console.log(chalk.yellow(`\nPlease manually visit: ${CELTRIX_SITE}\n`));
  }
}