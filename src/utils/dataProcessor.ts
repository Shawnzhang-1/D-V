export interface DataRecord {
  [key: string]: any;
}

export interface NumericRange {
  min?: number;
  max?: number;
}

export interface FilterOptions {
  column: string;
  range?: NumericRange;
  excludeNull?: boolean;
  excludeUndefined?: boolean;
}

export interface EMAOptions {
  column: string;
  alpha: number;
  outputColumn?: string;
}

export interface StatisticsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number | null;
  min: number;
  max: number;
  range: number;
  variance: number;
  standardDeviation: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
  };
  iqr: number;
}

export type TimeAggregationPeriod = 'day' | 'week' | 'month' | 'year';

export interface TimeAggregationOptions {
  timeColumn: string;
  valueColumn: string;
  period: TimeAggregationPeriod;
  aggregation: 'sum' | 'mean' | 'count' | 'min' | 'max';
  outputColumn?: string;
}

export interface CleanOptions {
  removeNull?: boolean;
  removeUndefined?: boolean;
  removeNaN?: boolean;
  removeOutliers?: boolean;
  outlierMethod?: 'iqr' | 'zscore';
  outlierThreshold?: number;
  columns?: string[];
}

export interface OutlierInfo {
  column: string;
  lowerBound: number;
  upperBound: number;
  outlierCount: number;
  outlierIndices: number[];
}

export function calculateEMA(
  data: DataRecord[],
  options: EMAOptions
): DataRecord[] {
  const { column, alpha, outputColumn } = options;
  const outputCol = outputColumn || `${column}_ema`;

  if (alpha <= 0 || alpha >= 1) {
    throw new Error('alpha 参数必须在 0 和 1 之间');
  }

  const values = data.map((row) => row[column]);

  if (values.length === 0) {
    return data.map((row) => ({ ...row, [outputCol]: null }));
  }

  const result: DataRecord[] = [];
  let ema: number | null = null;

  for (let i = 0; i < data.length; i++) {
    const value = values[i];

    if (typeof value !== 'number' || isNaN(value)) {
      result.push({ ...data[i], [outputCol]: ema });
      continue;
    }

    if (ema === null) {
      ema = value;
    } else {
      ema = alpha * value + (1 - alpha) * ema;
    }

    result.push({ ...data[i], [outputCol]: ema });
  }

  return result;
}

export function calculateEMAWithSpan(
  data: DataRecord[],
  column: string,
  span: number,
  outputColumn?: string
): DataRecord[] {
  if (span <= 0) {
    throw new Error('span 参数必须大于 0');
  }
  const alpha = 2 / (span + 1);
  return calculateEMA(data, { column, alpha, outputColumn });
}

export function filterByRange(
  data: DataRecord[],
  options: FilterOptions
): DataRecord[] {
  const { column, range, excludeNull, excludeUndefined } = options;

  return data.filter((row) => {
    const value = row[column];

    if (excludeNull && value === null) return false;
    if (excludeUndefined && value === undefined) return false;

    if (range && typeof value === 'number') {
      if (range.min !== undefined && value < range.min) return false;
      if (range.max !== undefined && value > range.max) return false;
    }

    return true;
  });
}

export function filterMultiple(
  data: DataRecord[],
  filters: FilterOptions[]
): DataRecord[] {
  return filters.reduce(
    (filteredData, filter) => filterByRange(filteredData, filter),
    data
  );
}

export function getNumericValues(data: DataRecord[], column: string): number[] {
  return data
    .map((row) => row[column])
    .filter(
      (value): value is number =>
        typeof value === 'number' && !isNaN(value) && isFinite(value)
    );
}

export function calculateStatistics(
  data: DataRecord[],
  column: string
): StatisticsResult | null {
  const values = getNumericValues(data, column);

  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;
  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;

  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);

  const q1Index = Math.floor(count * 0.25);
  const q2Index = Math.floor(count * 0.5);
  const q3Index = Math.floor(count * 0.75);
  const q1 = sorted[q1Index];
  const q2 = sorted[q2Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const frequencyMap = new Map<number, number>();
  let maxFrequency = 0;
  let mode: number | null = null;

  for (const val of sorted) {
    const freq = (frequencyMap.get(val) || 0) + 1;
    frequencyMap.set(val, freq);
    if (freq > maxFrequency) {
      maxFrequency = freq;
      mode = val;
    }
  }

  return {
    count,
    sum,
    mean,
    median,
    mode,
    min,
    max,
    range,
    variance,
    standardDeviation,
    quartiles: { q1, q2, q3 },
    iqr,
  };
}

export function calculatePercentile(
  data: DataRecord[],
  column: string,
  percentile: number
): number | null {
  if (percentile < 0 || percentile > 100) {
    throw new Error('percentile 必须在 0 到 100 之间');
  }

  const values = getNumericValues(data, column);
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);

  if (Number.isInteger(index)) {
    return sorted[index];
  }

  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function getDatePeriodKey(date: Date, period: TimeAggregationPeriod): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week': {
      const firstDayOfYear = new Date(year, 0, 1);
      const days = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    }
    case 'month':
      return `${year}-${month}`;
    case 'year':
      return `${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

function aggregateValues(values: number[], method: string): number {
  if (values.length === 0) return 0;

  switch (method) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0);
    case 'mean':
      return values.reduce((acc, val) => acc + val, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.reduce((acc, val) => acc + val, 0);
  }
}

export function aggregateByTime(
  data: DataRecord[],
  options: TimeAggregationOptions
): DataRecord[] {
  const { timeColumn, valueColumn, period, aggregation, outputColumn } = options;
  const outputCol = outputColumn || `${valueColumn}_${aggregation}`;

  const grouped = new Map<string, number[]>();

  for (const row of data) {
    const timeValue = row[timeColumn];
    const value = row[valueColumn];

    if (timeValue === null || timeValue === undefined) continue;
    if (typeof value !== 'number' || isNaN(value)) continue;

    let date: Date;
    if (timeValue instanceof Date) {
      date = timeValue;
    } else if (typeof timeValue === 'number') {
      date = new Date(timeValue > 100000000000 ? timeValue : timeValue * 1000);
    } else {
      date = new Date(timeValue);
    }

    if (isNaN(date.getTime())) continue;

    const key = getDatePeriodKey(date, period);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(value);
  }

  const result: DataRecord[] = [];
  const sortedKeys = [...grouped.keys()].sort();

  for (const key of sortedKeys) {
    const values = grouped.get(key)!;
    result.push({
      [timeColumn]: key,
      [outputCol]: aggregateValues(values, aggregation),
      _count: values.length,
    });
  }

  return result;
}

export function detectOutliersIQR(
  data: DataRecord[],
  column: string,
  threshold: number = 1.5
): OutlierInfo {
  const values = getNumericValues(data, column);

  if (values.length < 4) {
    return {
      column,
      lowerBound: 0,
      upperBound: 0,
      outlierCount: 0,
      outlierIndices: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;

  const q1Index = Math.floor(count * 0.25);
  const q3Index = Math.floor(count * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;

  const outlierIndices: number[] = [];

  data.forEach((row, index) => {
    const value = row[column];
    if (typeof value === 'number' && !isNaN(value)) {
      if (value < lowerBound || value > upperBound) {
        outlierIndices.push(index);
      }
    }
  });

  return {
    column,
    lowerBound,
    upperBound,
    outlierCount: outlierIndices.length,
    outlierIndices,
  };
}

export function detectOutliersZScore(
  data: DataRecord[],
  column: string,
  threshold: number = 3
): OutlierInfo {
  const values = getNumericValues(data, column);

  if (values.length < 2) {
    return {
      column,
      lowerBound: 0,
      upperBound: 0,
      outlierCount: 0,
      outlierIndices: [],
    };
  }

  const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return {
      column,
      lowerBound: mean,
      upperBound: mean,
      outlierCount: 0,
      outlierIndices: [],
    };
  }

  const lowerBound = mean - threshold * stdDev;
  const upperBound = mean + threshold * stdDev;

  const outlierIndices: number[] = [];

  data.forEach((row, index) => {
    const value = row[column];
    if (typeof value === 'number' && !isNaN(value)) {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > threshold) {
        outlierIndices.push(index);
      }
    }
  });

  return {
    column,
    lowerBound,
    upperBound,
    outlierCount: outlierIndices.length,
    outlierIndices,
  };
}

export function cleanData(
  data: DataRecord[],
  options: CleanOptions = {}
): DataRecord[] {
  const {
    removeNull = true,
    removeUndefined = true,
    removeNaN = true,
    removeOutliers = false,
    outlierMethod = 'iqr',
    outlierThreshold = 1.5,
    columns,
  } = options;

  let result = [...data];

  result = result.filter((row) => {
    const targetColumns = columns || Object.keys(row);

    for (const col of targetColumns) {
      const value = row[col];

      if (removeNull && value === null) return false;
      if (removeUndefined && value === undefined) return false;
      if (removeNaN && typeof value === 'number' && isNaN(value)) return false;
    }

    return true;
  });

  if (removeOutliers && columns && columns.length > 0) {
    const outlierIndices = new Set<number>();

    for (const column of columns) {
      const info = outlierMethod === 'iqr'
        ? detectOutliersIQR(result, column, outlierThreshold)
        : detectOutliersZScore(result, column, outlierThreshold);

      info.outlierIndices.forEach((idx) => outlierIndices.add(idx));
    }

    result = result.filter((_, index) => !outlierIndices.has(index));
  }

  return result;
}

export function fillMissingValues(
  data: DataRecord[],
  column: string,
  method: 'mean' | 'median' | 'mode' | 'zero' | 'forward' | 'backward',
  customValue?: number
): DataRecord[] {
  const values = getNumericValues(data, column);

  if (values.length === 0 && method !== 'zero' && customValue === undefined) {
    return data;
  }

  let fillValue: number;

  if (customValue !== undefined) {
    fillValue = customValue;
  } else {
    switch (method) {
      case 'mean':
        fillValue = values.reduce((acc, val) => acc + val, 0) / values.length;
        break;
      case 'median': {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        fillValue = sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
        break;
      }
      case 'mode': {
        const frequencyMap = new Map<number, number>();
        let maxFreq = 0;
        fillValue = values[0];
        for (const val of values) {
          const freq = (frequencyMap.get(val) || 0) + 1;
          frequencyMap.set(val, freq);
          if (freq > maxFreq) {
            maxFreq = freq;
            fillValue = val;
          }
        }
        break;
      }
      case 'zero':
        fillValue = 0;
        break;
      default:
        fillValue = values.reduce((acc, val) => acc + val, 0) / values.length;
    }
  }

  if (method === 'forward' || method === 'backward') {
    const result: DataRecord[] = [];
    let lastValid: number | null = null;

    const processRow = (row: DataRecord): DataRecord => {
      const value = row[column];
      if (typeof value === 'number' && !isNaN(value)) {
        lastValid = value;
        return row;
      }

      if (lastValid !== null) {
        return { ...row, [column]: lastValid };
      }

      return row;
    };

    if (method === 'forward') {
      for (const row of data) {
        result.push(processRow(row));
      }
    } else {
      const reversed = [...data].reverse();
      lastValid = null;
      const reversedResult = reversed.map(processRow);
      result.push(...reversedResult.reverse());
    }

    return result;
  }

  return data.map((row) => {
    const value = row[column];
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
      return { ...row, [column]: fillValue };
    }
    return row;
  });
}

export function normalizeColumn(
  data: DataRecord[],
  column: string,
  method: 'minmax' | 'zscore' = 'minmax',
  outputColumn?: string
): DataRecord[] {
  const values = getNumericValues(data, column);
  const outputCol = outputColumn || `${column}_normalized`;

  if (values.length === 0) {
    return data.map((row) => ({ ...row, [outputCol]: null }));
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return data.map((row) => {
    const value = row[column];

    if (typeof value !== 'number' || isNaN(value)) {
      return { ...row, [outputCol]: null };
    }

    let normalized: number;

    if (method === 'minmax') {
      normalized = max !== min ? (value - min) / (max - min) : 0;
    } else {
      normalized = stdDev !== 0 ? (value - mean) / stdDev : 0;
    }

    return { ...row, [outputCol]: normalized };
  });
}

export function calculateCorrelation(
  data: DataRecord[],
  column1: string,
  column2: string
): number | null {
  const pairs: [number, number][] = [];

  for (const row of data) {
    const val1 = row[column1];
    const val2 = row[column2];

    if (typeof val1 === 'number' && !isNaN(val1) &&
        typeof val2 === 'number' && !isNaN(val2)) {
      pairs.push([val1, val2]);
    }
  }

  if (pairs.length < 2) return null;

  const n = pairs.length;
  const sum1 = pairs.reduce((acc, [v1]) => acc + v1, 0);
  const sum2 = pairs.reduce((acc, [, v2]) => acc + v2, 0);
  const sum1Sq = pairs.reduce((acc, [v1]) => acc + v1 * v1, 0);
  const sum2Sq = pairs.reduce((acc, [, v2]) => acc + v2 * v2, 0);
  const sumProduct = pairs.reduce((acc, [v1, v2]) => acc + v1 * v2, 0);

  const numerator = n * sumProduct - sum1 * sum2;
  const denominator = Math.sqrt(
    (n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2)
  );

  if (denominator === 0) return null;

  return numerator / denominator;
}

export function calculateMovingAverage(
  data: DataRecord[],
  column: string,
  windowSize: number,
  outputColumn?: string
): DataRecord[] {
  const outputCol = outputColumn || `${column}_ma`;

  if (windowSize <= 0) {
    throw new Error('windowSize 必须大于 0');
  }

  const values = data.map((row) => row[column]);
  const result: DataRecord[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1).filter(
      (v): v is number => typeof v === 'number' && !isNaN(v)
    );

    if (window.length === 0) {
      result.push({ ...data[i], [outputCol]: null });
    } else {
      const avg = window.reduce((acc, val) => acc + val, 0) / window.length;
      result.push({ ...data[i], [outputCol]: avg });
    }
  }

  return result;
}
