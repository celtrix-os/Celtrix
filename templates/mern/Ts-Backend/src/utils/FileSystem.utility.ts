import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import xlsx from 'xlsx';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CsvRow, Document, XlsxRow } from '../type/FileSystem.type';

class FileSystemUtility {
  /**
   * Read file content
   * @param filePath - Relative path to the file
   * @returns Promise with the file content
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Write content to a file
   * @param filePath - Relative path to the file
   * @param data - Content to write
   * @returns Promise that resolves when writing is complete
   */
  async writeFile(filePath: string, data: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath);

    // Create directory if it doesn't exist
    const dir = path.dirname(fullPath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(fullPath, data, 'utf-8');
  }

  /**
   * Append content to a file
   * @param filePath - Relative path to the file
   * @param data - Content to append
   * @returns Promise that resolves when appending is complete
   */
  async appendToFile(filePath: string, data: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    await fs.appendFile(fullPath, data, 'utf-8');
  }

  /**
   * Check if a file exists
   * @param filePath - Relative path to the file
   * @returns true if file exists, false otherwise
   */
  fileExists(filePath: string): boolean {
    const fullPath = path.join(process.cwd(), filePath);
    return existsSync(fullPath);
  }

  /**
   * Delete a file
   * @param filePath - Relative path to the file
   * @returns Promise that resolves when deletion is complete
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    await fs.unlink(fullPath);
  }

  /**
   * Read XLSX file content
   * @param filePath - Relative path to the file
   * @returns Promise with the parsed XLSX data as JSON
   */
  async readXlsxFile(filePath: string): Promise<XlsxRow[]> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const workbook = xlsx.readFile(fullPath);
    const sheetNames = workbook.SheetNames;
    const firstSheet = sheetNames[0]
      ? workbook.Sheets[sheetNames[0]]
      : undefined;

    if (!firstSheet) {
      throw new Error(`No sheets found in the XLSX file: ${fullPath}`);
    }

    const data = xlsx.utils.sheet_to_json<XlsxRow>(firstSheet);
    return data;
  }

  /**
   * Read CSV file content using LangChain
   * @param filePath - Relative path to the file
   * @returns Promise with the parsed CSV data as Documents
   */
  async readCsvWithLangChain(filePath: string): Promise<Document[]> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const loader = new CSVLoader(fullPath);
    const docs = await loader.load();
    return docs;
  }

  /**
   * Read CSV file content using csv-parser
   * @param filePath - Relative path to the file
   * @returns Promise with the parsed CSV data as array
   */
  async readCsvFile(filePath: string): Promise<CsvRow[]> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    return new Promise((resolve, reject) => {
      const results: CsvRow[] = [];
      createReadStream(fullPath)
        .pipe(csv())
        .on('data', (data: CsvRow) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Read JSON file content
   * @param filePath - Relative path to the file
   * @returns Promise with the parsed JSON data
   */
  async readJsonFile<T>(filePath: string): Promise<T> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content) as T;
  }

  /**
   * Read PDF file with LangChain for processing
   * @param filePath - Relative path to the file
   * @returns Promise with LangChain document objects
   */
  async readPdfWithLangChain(filePath: string): Promise<Document[]> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const loader = new PDFLoader(fullPath);
    const docs = await loader.load();
    return docs;
  }

  /**
   * Read DOCX file with LangChain for processing
   * @param filePath - Relative path to the file
   * @returns Promise with LangChain document objects
   */
  async readDocxWithLangChain(filePath: string): Promise<Document[]> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const loader = new DocxLoader(fullPath);
    const docs = await loader.load();
    return docs;
  }
}

export default new FileSystemUtility();
