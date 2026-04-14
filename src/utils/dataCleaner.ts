export type FillMethod = 'forward' | 'backward' | 'linear' | 'mean' | 'median' | 'zero' | 'custom';

export type ConversionType = 'textToNumber' | 'numberToText' | 'toDate' | 'toText' | 'custom';

export type NormalizeMethod = 'minMax' | 'zScore' | 'decimal' | 'log';

export interface FillNullOptions {
  method: FillMethod;
  customValue?: string | number;
}

export interface ConversionOptions {
  type: ConversionType;
  dateFormat?: string;
  customFormat?: string;
}

export interface NormalizeOptions {
  method: NormalizeMethod;
  targetRange?: { min: number; max: number };
}

export interface CleaningOperation {
  id: string;
  type: 'fillNull' | 'removeNull' | 'convert' | 'deduplicate' | 'removeOutliers' | 'normalize';
  column?: string;
  options?: FillNullOptions | ConversionOptions | { threshold?: number } | NormalizeOptions;
  preview?: boolean;
}

export interface CleaningResult {
  data: Record<string, any>[];
  removedRows: number;
  modifiedCells: number;
  operations: string[];
}

export function fillNullValues(
  data: Record<string, any>[],
  column: string,
  options: FillNullOptions
): { data: Record<string, any>[]; modifiedCount: number } {
  const result = [...data];
  let modifiedCount = 0;

  const nonNullValues = data
    .map(row => row[column])
    .filter(v => v !== null && v !== undefined && v !== '');

  const mean = nonNullValues.length > 0
    ? nonNullValues.reduce((a, b) => a + Number(b), 0) / nonNullValues.length
    : 0;

  const sortedValues = [...nonNullValues].sort((a, b) => Number(a) - Number(b));
  const median = sortedValues.length > 0
    ? sortedValues[Math.floor(sortedValues.length / 2)]
    : 0;

  let lastValidValue: any = null;

  switch (options.method) {
    case 'forward':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (value === null || value === undefined || value === '') {
          if (lastValidValue !== null) {
            result[i] = { ...result[i], [column]: lastValidValue };
            modifiedCount++;
          }
        } else {
          lastValidValue = value;
        }
      }
      break;

    case 'backward':
      for (let i = result.length - 1; i >= 0; i--) {
        const value = result[i][column];
        if (value === null || value === undefined || value === '') {
          if (lastValidValue !== null) {
            result[i] = { ...result[i], [column]: lastValidValue };
            modifiedCount++;
          }
        } else {
          lastValidValue = value;
        }
      }
      break;

    case 'linear':
      const indices: number[] = [];
      const values: number[] = [];
      
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (value !== null && value !== undefined && value !== '') {
          const num = Number(value);
          if (!isNaN(num)) {
            indices.push(i);
            values.push(num);
          }
        }
      }

      if (indices.length >= 2) {
        for (let i = 0; i < result.length; i++) {
          const value = result[i][column];
          if (value === null || value === undefined || value === '') {
            let leftIdx = 0;
            for (let j = 0; j < indices.length; j++) {
              if (indices[j] < i) leftIdx = j;
              else break;
            }
            
            const rightIdx = leftIdx + 1 < indices.length ? leftIdx + 1 : leftIdx;
            
            if (indices[leftIdx] !== undefined && indices[rightIdx] !== undefined && leftIdx !== rightIdx) {
              const leftVal = values[leftIdx];
              const rightVal = values[rightIdx];
              const ratio = (i - indices[leftIdx]) / (indices[rightIdx] - indices[leftIdx]);
              const interpolated = leftVal + ratio * (rightVal - leftVal);
              result[i] = { ...result[i], [column]: interpolated };
              modifiedCount++;
            }
          }
        }
      }
      break;

    case 'mean':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (value === null || value === undefined || value === '') {
          result[i] = { ...result[i], [column]: mean };
          modifiedCount++;
        }
      }
      break;

    case 'median':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (value === null || value === undefined || value === '') {
          result[i] = { ...result[i], [column]: median };
          modifiedCount++;
        }
      }
      break;

    case 'zero':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (value === null || value === undefined || value === '') {
          result[i] = { ...result[i], [column]: 0 };
          modifiedCount++;
        }
      }
      break;

    case 'custom':
      if (options.customValue !== undefined) {
        for (let i = 0; i < result.length; i++) {
          const value = result[i][column];
          if (value === null || value === undefined || value === '') {
            result[i] = { ...result[i], [column]: options.customValue };
            modifiedCount++;
          }
        }
      }
      break;
  }

  return { data: result, modifiedCount };
}

export function removeNullRows(
  data: Record<string, any>[],
  columns: string[]
): { data: Record<string, any>[]; removedCount: number } {
  const result = data.filter(row => {
    return columns.every(col => {
      const value = row[col];
      return value !== null && value !== undefined && value !== '';
    });
  });

  return {
    data: result,
    removedCount: data.length - result.length,
  };
}

export function convertColumn(
  data: Record<string, any>[],
  column: string,
  options: ConversionOptions
): { data: Record<string, any>[]; modifiedCount: number; errorCount: number } {
  const result = [...data];
  let modifiedCount = 0;
  let errorCount = 0;

  switch (options.type) {
    case 'textToNumber':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (typeof value === 'string') {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            result[i] = { ...result[i], [column]: num };
            modifiedCount++;
          } else {
            errorCount++;
          }
        }
      }
      break;

    case 'numberToText':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (typeof value === 'number') {
          result[i] = { ...result[i], [column]: String(value) };
          modifiedCount++;
        }
      }
      break;

    case 'toDate':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (value !== null && value !== undefined) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            result[i] = { ...result[i], [column]: date.toISOString().split('T')[0] };
            modifiedCount++;
          } else {
            errorCount++;
          }
        }
      }
      break;

    case 'toText':
      for (let i = 0; i < result.length; i++) {
        const value = result[i][column];
        if (value !== null && value !== undefined) {
          result[i] = { ...result[i], [column]: String(value) };
          modifiedCount++;
        }
      }
      break;
  }

  return { data: result, modifiedCount, errorCount };
}

export function removeDuplicates(
  data: Record<string, any>[],
  columns: string[]
): { data: Record<string, any>[]; removedCount: number } {
  const seen = new Set<string>();
  const result: Record<string, any>[] = [];

  for (const row of data) {
    const key = columns.map(col => row[col]).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }

  return {
    data: result,
    removedCount: data.length - result.length,
  };
}

export function detectOutliers(
  data: Record<string, any>[],
  column: string,
  threshold: number = 1.5
): { indices: number[]; values: number[]; lowerBound: number; upperBound: number } {
  const values = data
    .map(row => row[column])
    .filter(v => typeof v === 'number' && !isNaN(v)) as number[];

  if (values.length === 0) {
    return { indices: [], values: [], lowerBound: 0, upperBound: 0 };
  }

  values.sort((a, b) => a - b);
  
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  const outlierIndices: number[] = [];
  const outlierValues: number[] = [];

  data.forEach((row, index) => {
    const value = row[column];
    if (typeof value === 'number' && !isNaN(value)) {
      if (value < lowerBound || value > upperBound) {
        outlierIndices.push(index);
        outlierValues.push(value);
      }
    }
  });

  return {
    indices: outlierIndices,
    values: outlierValues,
    lowerBound,
    upperBound,
  };
}

export function removeOutliers(
  data: Record<string, any>[],
  column: string,
  threshold: number = 1.5
): { data: Record<string, any>[]; removedCount: number } {
  const { indices } = detectOutliers(data, column, threshold);
  const indicesSet = new Set(indices);
  
  const result = data.filter((_, index) => !indicesSet.has(index));

  return {
    data: result,
    removedCount: indices.length,
  };
}

export function normalizeColumn(
  data: Record<string, any>[],
  column: string,
  options: NormalizeOptions
): { data: Record<string, any>[]; modifiedCount: number; stats: { min?: number; max?: number; mean?: number; std?: number } } {
  const result = [...data];
  let modifiedCount = 0;

  const numericValues = data
    .map(row => row[column])
    .filter(v => typeof v === 'number' && !isNaN(v)) as number[];

  if (numericValues.length === 0) {
    return { data: result, modifiedCount: 0, stats: {} };
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
  const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
  const std = Math.sqrt(variance);

  const targetMin = options.targetRange?.min ?? 0;
  const targetMax = options.targetRange?.max ?? 1;

  for (let i = 0; i < result.length; i++) {
    const value = result[i][column];
    if (typeof value === 'number' && !isNaN(value)) {
      let normalizedValue: number;

      switch (options.method) {
        case 'minMax':
          if (max !== min) {
            normalizedValue = targetMin + ((value - min) / (max - min)) * (targetMax - targetMin);
          } else {
            normalizedValue = targetMin;
          }
          break;

        case 'zScore':
          if (std !== 0) {
            normalizedValue = (value - mean) / std;
          } else {
            normalizedValue = 0;
          }
          break;

        case 'decimal':
          const absValue = Math.abs(value);
          if (absValue > 0) {
            const scale = Math.pow(10, Math.ceil(Math.log10(absValue)));
            normalizedValue = value / scale;
          } else {
            normalizedValue = 0;
          }
          break;

        case 'log':
          if (value > 0) {
            normalizedValue = Math.log(value);
          } else if (value === 0) {
            normalizedValue = 0;
          } else {
            normalizedValue = NaN;
          }
          break;

        default:
          normalizedValue = value;
      }

      if (!isNaN(normalizedValue)) {
        result[i] = { ...result[i], [column]: Number(normalizedValue.toFixed(6)) };
        modifiedCount++;
      }
    }
  }

  return {
    data: result,
    modifiedCount,
    stats: { min, max, mean, std }
  };
}

export function getColumnStats(data: Record<string, any>[], column: string): {
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
} {
  const values = data.map(row => row[column]);
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const numericValues = nonNullValues
    .map(v => Number(v))
    .filter(n => !isNaN(n));

  const sortedNumeric = [...numericValues].sort((a, b) => a - b);

  return {
    nullCount: values.length - nonNullValues.length,
    uniqueCount: new Set(nonNullValues.map(v => String(v))).size,
    min: numericValues.length > 0 ? Math.min(...numericValues) : undefined,
    max: numericValues.length > 0 ? Math.max(...numericValues) : undefined,
    mean: numericValues.length > 0
      ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      : undefined,
    median: sortedNumeric.length > 0
      ? sortedNumeric[Math.floor(sortedNumeric.length / 2)]
      : undefined,
  };
}

export function applyCleaningOperations(
  data: Record<string, any>[],
  operations: CleaningOperation[]
): CleaningResult {
  let result = [...data];
  let totalRemovedRows = 0;
  let totalModifiedCells = 0;
  const operationLogs: string[] = [];

  for (const op of operations) {
    switch (op.type) {
      case 'fillNull':
        if (op.column && op.options) {
          const fillResult = fillNullValues(result, op.column, op.options as FillNullOptions);
          result = fillResult.data;
          totalModifiedCells += fillResult.modifiedCount;
          operationLogs.push(`填充空值: ${op.column} (${fillResult.modifiedCount} 个单元格)`);
        }
        break;

      case 'removeNull':
        if (op.column) {
          const removeResult = removeNullRows(result, [op.column]);
          result = removeResult.data;
          totalRemovedRows += removeResult.removedCount;
          operationLogs.push(`删除空值行: ${op.column} (${removeResult.removedCount} 行)`);
        }
        break;

      case 'convert':
        if (op.column && op.options) {
          const convertResult = convertColumn(result, op.column, op.options as ConversionOptions);
          result = convertResult.data;
          totalModifiedCells += convertResult.modifiedCount;
          operationLogs.push(`格式转换: ${op.column} (${convertResult.modifiedCount} 个单元格)`);
        }
        break;

      case 'deduplicate':
        const dedupeResult = removeDuplicates(result, op.column ? [op.column] : Object.keys(result[0] || {}));
        result = dedupeResult.data;
        totalRemovedRows += dedupeResult.removedCount;
        operationLogs.push(`去重: ${dedupeResult.removedCount} 行`);
        break;

      case 'removeOutliers':
        if (op.column) {
          const threshold = (op.options as { threshold?: number })?.threshold || 1.5;
          const outlierResult = removeOutliers(result, op.column, threshold);
          result = outlierResult.data;
          totalRemovedRows += outlierResult.removedCount;
          operationLogs.push(`删除异常值: ${op.column} (${outlierResult.removedCount} 行)`);
        }
        break;

      case 'normalize':
        if (op.column && op.options) {
          const normalizeResult = normalizeColumn(result, op.column, op.options as NormalizeOptions);
          result = normalizeResult.data;
          totalModifiedCells += normalizeResult.modifiedCount;
          const methodNames: Record<NormalizeMethod, string> = {
            minMax: 'Min-Max归一化',
            zScore: 'Z-Score标准化',
            decimal: '小数定标',
            log: '对数变换'
          };
          operationLogs.push(`${methodNames[(op.options as NormalizeOptions).method]}: ${op.column} (${normalizeResult.modifiedCount} 个单元格)`);
        }
        break;
    }
  }

  return {
    data: result,
    removedRows: totalRemovedRows,
    modifiedCells: totalModifiedCells,
    operations: operationLogs,
  };
}
