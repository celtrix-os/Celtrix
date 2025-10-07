import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import logger from '../utils/logger';
import cron from 'node-cron';

const logDir = path.join(__dirname, '../log');
const archiveDir = path.join(__dirname, '../log_archive');

if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

const zipOldLogs = () => {
  logger.info('Running log zipping task...');

  fs.readdirSync(logDir).forEach((folder) => {
    const folderPath = path.join(logDir, folder);
    const stats = fs.statSync(folderPath);
    const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (stats.isDirectory() && ageInDays > 7) {
      const zipPath = path.join(archiveDir, `${folder}.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);
      archive.directory(folderPath, folder);
      archive.finalize();

      fs.rmSync(folderPath, { recursive: true, force: true });

      logger.info(`Zipped folder ${folder} -> ${zipPath}`);
    }
  });

  fs.readdirSync(archiveDir).forEach((file) => {
    const filePath = path.join(archiveDir, file);
    const stats = fs.statSync(filePath);
    const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageInDays > 30) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted old zip file: ${file}`);
    }
  });
};

cron.schedule('0 2 * * *', () => {
  zipOldLogs();
  logger.info('Log zipping task finished.');
});
