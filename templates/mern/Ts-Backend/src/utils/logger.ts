import winston from 'winston';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { TIMESTAMP_FORMAT } from '../constant';

const logDir = path.join(__dirname, '../log');
const archiveDir = path.join(__dirname, '../log_archive');

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

const today = new Date();
const folderName = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const todayFolder = path.join(logDir, folderName);

if (!fs.existsSync(todayFolder)) fs.mkdirSync(todayFolder, { recursive: true });

const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `[${timestamp}] ${level.toUpperCase().padEnd(7)} ${message}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: TIMESTAMP_FORMAT }),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(todayFolder, 'error.log'),
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join(todayFolder, 'warn.log'),
      level: 'warn',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join(todayFolder, 'success.log'),
      level: 'info',
      format: logFormat,
    }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});

const zipOldLogs = () => {
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
    }
  });

  fs.readdirSync(archiveDir).forEach((file) => {
    const filePath = path.join(archiveDir, file);
    const stats = fs.statSync(filePath);
    const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageInDays > 30) fs.unlinkSync(filePath);
  });
};

zipOldLogs();

setInterval(zipOldLogs, 24 * 60 * 60 * 1000);

export default logger;
