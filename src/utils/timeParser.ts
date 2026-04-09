export type TimeFormat =
  | 'YYYY-MM-DD'
  | 'YYYY/MM/DD'
  | 'DD-MM-YYYY'
  | 'DD/MM/YYYY'
  | 'MM-DD-YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD HH:mm:ss'
  | 'YYYY/MM/DD HH:mm:ss'
  | 'timestamp'
  | 'timestamp_ms'
  | 'ISO8601'
  | 'unknown';

export interface TimeColumnInfo {
  columnName: string;
  format: TimeFormat;
  sampleValues: string[];
  confidence: number;
}

export interface ParsedTimeResult {
  success: boolean;
  date: Date | null;
  originalValue: any;
  format: TimeFormat;
}

const TIME_PATTERNS: { format: TimeFormat; regex: RegExp; parser: (match: RegExpMatchArray) => Date | null }[] = [
  {
    format: 'ISO8601',
    regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
    parser: (match) => {
      const date = new Date(match[0]);
      return isNaN(date.getTime()) ? null : date;
    },
  },
  {
    format: 'YYYY-MM-DD HH:mm:ss',
    regex: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
    parser: (match) => {
      const parts = match[0].split(/[\s:]/);
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(parts[3]),
        parseInt(parts[4]),
        parseInt(parts[5])
      );
    },
  },
  {
    format: 'YYYY/MM/DD HH:mm:ss',
    regex: /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/,
    parser: (match) => {
      const parts = match[0].split(/[\/\s:]/);
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(parts[3]),
        parseInt(parts[4]),
        parseInt(parts[5])
      );
    },
  },
  {
    format: 'YYYY-MM-DD',
    regex: /^\d{4}-\d{2}-\d{2}$/,
    parser: (match) => {
      const parts = match[0].split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    },
  },
  {
    format: 'YYYY/MM/DD',
    regex: /^\d{4}\/\d{2}\/\d{2}$/,
    parser: (match) => {
      const parts = match[0].split('/');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    },
  },
  {
    format: 'DD-MM-YYYY',
    regex: /^\d{2}-\d{2}-\d{4}$/,
    parser: (match) => {
      const parts = match[0].split('-');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    },
  },
  {
    format: 'DD/MM/YYYY',
    regex: /^\d{2}\/\d{2}\/\d{4}$/,
    parser: (match) => {
      const parts = match[0].split('/');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    },
  },
  {
    format: 'MM-DD-YYYY',
    regex: /^\d{2}-\d{2}-\d{4}$/,
    parser: (match) => {
      const parts = match[0].split('-');
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      if (first > 12) {
        return new Date(parseInt(parts[2]), second - 1, first);
      }
      return new Date(parseInt(parts[2]), first - 1, second);
    },
  },
  {
    format: 'MM/DD/YYYY',
    regex: /^\d{2}\/\d{2}\/\d{4}$/,
    parser: (match) => {
      const parts = match[0].split('/');
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      if (first > 12) {
        return new Date(parseInt(parts[2]), second - 1, first);
      }
      return new Date(parseInt(parts[2]), first - 1, second);
    },
  },
];

export function isTimestamp(value: any): boolean {
  if (typeof value === 'number') {
    return value > 0 && value < 9999999999999;
  }
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return !isNaN(num) && num > 0 && num < 9999999999999;
  }
  return false;
}

export function detectTimeFormat(value: any): TimeFormat {
  if (value === null || value === undefined) {
    return 'unknown';
  }

  if (typeof value === 'number') {
    if (value > 1000000000000) {
      return 'timestamp_ms';
    }
    if (value > 0 && value < 100000000000) {
      return 'timestamp';
    }
    return 'unknown';
  }

  const strValue = String(value).trim();

  if (isTimestamp(value)) {
    const num = parseInt(strValue, 10);
    return num > 1000000000000 ? 'timestamp_ms' : 'timestamp';
  }

  for (const pattern of TIME_PATTERNS) {
    if (pattern.regex.test(strValue)) {
      return pattern.format;
    }
  }

  const date = new Date(strValue);
  if (!isNaN(date.getTime())) {
    return 'ISO8601';
  }

  return 'unknown';
}

export function parseTimeValue(value: any, format?: TimeFormat): ParsedTimeResult {
  if (value === null || value === undefined) {
    return { success: false, date: null, originalValue: value, format: format || 'unknown' };
  }

  const detectedFormat = format || detectTimeFormat(value);

  if (detectedFormat === 'unknown') {
    return { success: false, date: null, originalValue: value, format: 'unknown' };
  }

  let date: Date | null = null;

  switch (detectedFormat) {
    case 'timestamp':
      date = new Date(parseInt(String(value), 10) * 1000);
      break;
    case 'timestamp_ms':
      date = new Date(parseInt(String(value), 10));
      break;
    case 'ISO8601':
      date = new Date(String(value));
      break;
    default: {
      const strValue = String(value).trim();
      const pattern = TIME_PATTERNS.find((p) => p.format === detectedFormat);
      if (pattern) {
        const match = strValue.match(pattern.regex);
        if (match) {
          date = pattern.parser(match);
        }
      }
    }
  }

  if (date && !isNaN(date.getTime())) {
    return { success: true, date, originalValue: value, format: detectedFormat };
  }

  return { success: false, date: null, originalValue: value, format: detectedFormat };
}

export function identifyTimeColumns(
  data: Record<string, any>[],
  headers: string[],
  sampleSize: number = 100
): TimeColumnInfo[] {
  const results: TimeColumnInfo[] = [];

  for (const column of headers) {
    const values = data.slice(0, sampleSize).map((row) => row[column]).filter((v) => v !== null && v !== undefined);

    if (values.length === 0) continue;

    const formatCounts: Map<TimeFormat, number> = new Map();

    for (const value of values) {
      const format = detectTimeFormat(value);
      formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
    }

    formatCounts.delete('unknown');

    if (formatCounts.size === 0) continue;

    let bestFormat: TimeFormat = 'unknown';
    let bestCount = 0;

    for (const [format, count] of formatCounts) {
      if (count > bestCount) {
        bestCount = count;
        bestFormat = format;
      }
    }

    const confidence = bestCount / values.length;

    if (confidence >= 0.5) {
      const sampleValues = values.slice(0, 5).map(String);
      results.push({
        columnName: column,
        format: bestFormat,
        sampleValues,
        confidence,
      });
    }
  }

  return results;
}

export function formatTimeValue(date: Date, outputFormat: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return outputFormat
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function sortByTime(
  data: Record<string, any>[],
  timeColumn: string,
  ascending: boolean = true
): Record<string, any>[] {
  return [...data].sort((a, b) => {
    const aResult = parseTimeValue(a[timeColumn]);
    const bResult = parseTimeValue(b[timeColumn]);

    if (!aResult.success && !bResult.success) return 0;
    if (!aResult.success) return ascending ? 1 : -1;
    if (!bResult.success) return ascending ? -1 : 1;

    const diff = aResult.date!.getTime() - bResult.date!.getTime();
    return ascending ? diff : -diff;
  });
}

export function isValidDate(value: any): boolean {
  const result = parseTimeValue(value);
  return result.success;
}

export function getTimeRange(
  data: Record<string, any>[],
  timeColumn: string
): { min: Date | null; max: Date | null } {
  let min: Date | null = null;
  let max: Date | null = null;

  for (const row of data) {
    const result = parseTimeValue(row[timeColumn]);
    if (result.success && result.date) {
      if (!min || result.date < min) min = result.date;
      if (!max || result.date > max) max = result.date;
    }
  }

  return { min, max };
}

export function convertTimeColumn(
  data: Record<string, any>[],
  timeColumn: string,
  outputFormat: string = 'YYYY-MM-DD'
): Record<string, any>[] {
  return data.map((row) => {
    const result = parseTimeValue(row[timeColumn]);
    return {
      ...row,
      [timeColumn]: result.success && result.date
        ? formatTimeValue(result.date, outputFormat)
        : row[timeColumn],
    };
  });
}
