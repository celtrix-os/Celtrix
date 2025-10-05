export interface Document {
    pageContent: string;
    metadata: Record<string, unknown>;
  }
  
export interface XlsxRow {
    [key: string]: string | number | boolean | null;
  }
  
export interface CsvRow {
    [key: string]: string;
  }