import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
  headers: string[];
  data: any[];
  totalCount: number;
}

export interface ParseOptions {
  encoding?: string;
  sheetName?: string;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
  headerRow?: number;
  dataStartRow?: number;
  maxRows?: number;
}

export interface PreviewData {
  rows: any[][];
  totalRows: number;
}

const DEFAULT_MAX_ROWS = 100000;

const parseCache = new Map<string, ParsedData>();

function getCacheKey(file: File, options: ParseOptions): string {
  return `${file.name}-${file.lastModified}-${file.size}-${options.headerRow}-${options.dataStartRow}`;
}

export class FileParseError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'FileParseError';
  }
}

function sanitizeHeader(header: string): string {
  if (!header || String(header).trim() === '') {
    return '';
  }
  
  let sanitized = String(header).trim();
  sanitized = sanitized.replace(/[\r\n\t]+/g, ' ');
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  sanitized = sanitized.trim();
  sanitized = sanitized.replace(/[\\/:*?"<>|]/g, '_');
  sanitized = sanitized.replace(/_{2,}/g, '_');
  
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized || '未命名列';
}

function detectEncoding(text: string): string {
  const chinesePatterns = [
    /[\u4e00-\u9fa5]/,
    /[\u3400-\u4dbf]/,
  ];
  
  const hasValidChinese = chinesePatterns.some(pattern => pattern.test(text));
  if (hasValidChinese) {
    return 'UTF-8';
  }
  
  const hasReplacementChar = text.includes('\uFFFD');
  if (hasReplacementChar) {
    return 'GBK';
  }
  
  return 'UTF-8';
}

async function detectFileEncoding(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        resolve('UTF-8');
        return;
      }
      resolve(detectEncoding(text));
    };
    reader.onerror = () => resolve('UTF-8');
    const blob = file.slice(0, Math.min(file.size, 10000));
    reader.readAsText(blob, 'UTF-8');
  });
}

async function tryParseCSVWithEncoding(
  file: File,
  encoding: string,
  previewRows: number
): Promise<{ rows: any[][]; success: boolean }> {
  return new Promise((resolve) => {
    const rows: any[][] = [];
    let rowIndex = 0;
    
    Papa.parse(file as any, {
      header: false,
      skipEmptyLines: true,
      preview: previewRows,
      encoding: encoding,
      chunk: (results) => {
        const data = results.data as any[][];
        for (const row of data) {
          if (rowIndex < previewRows) {
            rows.push(row);
            rowIndex++;
          }
        }
      },
      complete: () => {
        const text = rows.flat().join('');
        const detectedEncoding = detectEncoding(text);
        const success = detectedEncoding === 'UTF-8' || encoding === detectedEncoding;
        resolve({ rows, success });
      },
      error: () => {
        resolve({ rows: [], success: false });
      },
    });
  });
}

export function previewFile(
  file: File,
  previewRows: number = 20
): Promise<PreviewData> {
  return new Promise(async (resolve, reject) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      try {
        let result = await tryParseCSVWithEncoding(file, 'UTF-8', previewRows);
        
        if (!result.success || result.rows.length === 0) {
          result = await tryParseCSVWithEncoding(file, 'GBK', previewRows);
        }
        
        if (!result.success || result.rows.length === 0) {
          result = await tryParseCSVWithEncoding(file, 'GB2312', previewRows);
        }
        
        resolve({ rows: result.rows, totalRows: result.rows.length });
      } catch (error) {
        reject(new FileParseError(`预览失败: ${error instanceof Error ? error.message : '未知错误'}`, error instanceof Error ? error : undefined));
      }
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new FileParseError('无法读取文件内容');
          }
          
          const workbook = XLSX.read(data, { 
            type: 'array',
            codepage: 65001,
          });
          
          if (!workbook) {
            throw new FileParseError('Excel 文件解析失败：无法创建工作簿');
          }
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new FileParseError('Excel 文件中没有找到任何工作表');
          }
          
          if (!workbook.Sheets) {
            throw new FileParseError('Excel 文件结构异常：无法访问工作表数据');
          }
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          if (!worksheet) {
            throw new FileParseError('无法读取工作表');
          }
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
            raw: false,
          }) as any[][];
          
          resolve({ 
            rows: jsonData.slice(0, previewRows), 
            totalRows: jsonData.length 
          });
        } catch (error) {
          reject(new FileParseError('预览失败', error instanceof Error ? error : undefined));
        }
      };
      
      reader.onerror = () => reject(new FileParseError('文件读取失败'));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new FileParseError(`不支持的文件格式: ${extension}`));
    }
  });
}

function parseCSVWithEncoding(
  file: File,
  encoding: string,
  options: ParseOptions
): Promise<ParsedData> {
  const { 
    chunkSize, 
    onProgress, 
    headerRow = 1, 
    dataStartRow = 2,
    maxRows = DEFAULT_MAX_ROWS,
  } = options;
  
  return new Promise((resolve, reject) => {
    const allData: any[] = [];
    let headers: string[] = [];
    let rowIndex = 0;
    let processedBytes = 0;
    const effectiveChunkSize = chunkSize || 1024 * 1024 * 5;
    const headerRowIndex = headerRow - 1;
    const dataStartIndex = dataStartRow - 1;
    let totalDataRows = 0;

    const config: Record<string, unknown> = {
      header: false,
      skipEmptyLines: true,
      chunkSize: effectiveChunkSize,
      encoding: encoding,
      transformHeader: (h: string) => sanitizeHeader(h),
      chunk: (results: Papa.ParseResult<unknown>, parser: Papa.Parser) => {
        if (results.errors.length > 0 && results.errors[0].type !== 'Quotes') {
          const errorMessage = results.errors
            .map((e: Papa.ParseError) => e.message)
            .join(', ');
          parser.abort();
          reject(new FileParseError(`CSV 解析错误: ${errorMessage}`));
          return;
        }

        const rows = results.data as any[][];
        
        for (const row of rows) {
          if (rowIndex === headerRowIndex) {
            headers = row.map((h) => sanitizeHeader(h !== null && h !== undefined ? String(h) : ''));
          } else if (rowIndex >= dataStartIndex) {
            if (totalDataRows < maxRows) {
              const obj: Record<string, any> = {};
              for (let i = 0; i < headers.length; i++) {
                const header = headers[i];
                if (!header) continue;
                const value = row[i];
                if (value !== undefined && value !== null && value !== '') {
                  const num = Number(value);
                  obj[header] = isNaN(num) ? value : num;
                } else {
                  obj[header] = null;
                }
              }
              allData.push(obj);
            }
            totalDataRows++;
          }
          rowIndex++;
        }

        if (onProgress && file.size > 0) {
          processedBytes += effectiveChunkSize;
          const progress = Math.min((processedBytes / file.size) * 90, 90);
          onProgress(progress);
        }
        
        if (totalDataRows >= maxRows) {
          parser.abort();
        }
      },
      complete: () => {
        headers = deduplicateHeaders(headers);
        const result = {
          headers,
          data: allData,
          totalCount: totalDataRows,
        };
        onProgress?.(100);
        resolve(result);
      },
      error: (error: Error) => {
        reject(new FileParseError(`CSV 解析失败: ${error.message}`, error));
      },
    };

    Papa.parse(file as any, config as any);
  });
}

function deduplicateHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    if (!header) return header;
    
    const count = seen.get(header) || 0;
    seen.set(header, count + 1);
    
    if (count > 0) {
      return `${header}_${count}`;
    }
    return header;
  });
}

export function parseCSV(
  file: File,
  options: ParseOptions = {}
): Promise<ParsedData> {
  const cacheKey = getCacheKey(file, options);
  const cached = parseCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise(async (resolve, reject) => {
    const { encoding } = options;
    
    try {
      let detectedEncoding = encoding;
      
      if (!detectedEncoding) {
        detectedEncoding = await detectFileEncoding(file);
      }
      
      let result = await parseCSVWithEncoding(file, detectedEncoding, options);
      
      const sampleText = result.data.slice(0, 10).map(row => Object.values(row).join('')).join('');
      const hasReplacementChar = sampleText.includes('\uFFFD');
      
      if (hasReplacementChar && !encoding) {
        result = await parseCSVWithEncoding(file, 'GBK', options);
      }
      
      parseCache.set(cacheKey, result);
      resolve(result);
    } catch (error) {
      if (error instanceof FileParseError) {
        reject(error);
      } else {
        reject(new FileParseError(`CSV 解析失败: ${error instanceof Error ? error.message : '未知错误'}`, error instanceof Error ? error : undefined));
      }
    }
  });
}

export function parseExcel(
  file: File,
  options: ParseOptions = {}
): Promise<ParsedData> {
  const cacheKey = getCacheKey(file, options);
  const cached = parseCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const { 
      sheetName, 
      onProgress, 
      headerRow = 1, 
      dataStartRow = 2,
      maxRows = DEFAULT_MAX_ROWS,
    } = options;
    
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (onProgress) onProgress(5);
        
        const data = e.target?.result;
        if (!data) {
          throw new FileParseError('无法读取文件内容');
        }

        if (onProgress) onProgress(20);
        
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: true,
          cellStyles: false,
          codepage: 65001,
          raw: false,
        });

        if (onProgress) onProgress(35);

        if (!workbook) {
          throw new FileParseError('Excel 文件解析失败：无法创建工作簿');
        }

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new FileParseError('Excel 文件中没有找到任何工作表');
        }

        if (!workbook.Sheets) {
          throw new FileParseError('Excel 文件结构异常：无法访问工作表数据');
        }

        let targetSheetName = sheetName || workbook.SheetNames[0];
        
        if (!workbook.Sheets[targetSheetName]) {
          targetSheetName = workbook.SheetNames[0];
        }
        
        const worksheet = workbook.Sheets[targetSheetName];
        if (!worksheet) {
          throw new FileParseError(
            `无法读取工作表，可用的工作表: ${workbook.SheetNames.join(', ')}`
          );
        }

        if (onProgress) onProgress(50);

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
          raw: false,
          blankrows: false,
          dateNF: 'yyyy-mm-dd',
        }) as any[][];

        if (jsonData.length === 0) {
          const result = { headers: [], data: [], totalCount: 0 };
          parseCache.set(cacheKey, result);
          resolve(result);
          return;
        }

        if (onProgress) onProgress(65);

        const headerRowIndex = headerRow - 1;
        const dataStartIndex = dataStartRow - 1;

        const headers = deduplicateHeaders(
          (jsonData[headerRowIndex] || []).map((h) =>
            sanitizeHeader(h !== null && h !== undefined ? String(h) : '')
          )
        );

        const dataRows = jsonData.slice(dataStartIndex);
        const totalDataRows = dataRows.length;
        
        const processedData: any[] = [];
        const rowsToProcess = Math.min(dataRows.length, maxRows);
        
        for (let i = 0; i < rowsToProcess; i++) {
          const row = dataRows[i];
          const obj: Record<string, any> = {};
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            if (!header) continue;
            const value = row[j];
            if (value !== undefined && value !== null && value !== '') {
              const num = Number(value);
              obj[header] = isNaN(num) ? value : num;
            } else {
              obj[header] = null;
            }
          }
          processedData.push(obj);
        }

        if (onProgress) onProgress(85);

        const result = {
          headers,
          data: processedData,
          totalCount: totalDataRows,
        };
        
        parseCache.set(cacheKey, result);
        
        if (onProgress) onProgress(100);

        resolve(result);
      } catch (error) {
        if (error instanceof FileParseError) {
          reject(error);
        } else {
          reject(
            new FileParseError(
              `Excel 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
              error instanceof Error ? error : undefined
            )
          );
        }
      }
    };

    reader.onerror = () => {
      reject(new FileParseError('文件读取失败'));
    };

    reader.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        const progress = (e.loaded / e.total) * 5;
        onProgress(progress);
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

export function parseFile(
  file: File,
  options: ParseOptions = {}
): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'csv':
      return parseCSV(file, options);
    case 'xlsx':
    case 'xls':
      return parseExcel(file, options);
    default:
      return Promise.reject(
        new FileParseError(
          `不支持的文件格式: ${extension}，仅支持 CSV 和 Excel 文件`
        )
      );
  }
}

export function clearCache(): void {
  parseCache.clear();
}

export function getSupportedExtensions(): string[] {
  return ['csv', 'xlsx', 'xls'];
}

export function isSupportedFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? getSupportedExtensions().includes(extension) : false;
}

export function sampleDataByRange<T>(
  data: T[], 
  startRow: number, 
  endRow: number, 
  maxDisplay: number
): T[] {
  const start = Math.max(0, startRow);
  const end = Math.min(data.length, endRow);
  const rangeData = data.slice(start, end);
  
  if (rangeData.length <= maxDisplay) {
    return rangeData;
  }
  
  const step = rangeData.length / maxDisplay;
  const sampled: T[] = [];
  for (let i = 0; i < maxDisplay; i++) {
    sampled.push(rangeData[Math.floor(i * step)]);
  }
  return sampled;
}
