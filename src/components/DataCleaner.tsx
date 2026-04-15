import React, { useState, useMemo, useCallback } from 'react';
import { AlertTriangle, CheckCircle, X, Trash2, ArrowUp, ArrowDown, TrendingUp, Hash, Type } from 'lucide-react';
import {
  FillMethod,
  ConversionType,
  NormalizeMethod,
  SmoothMethod,
  FillNullOptions,
  ConversionOptions,
  NormalizeOptions,
  SmoothOptions,
  getColumnStats,
  fillNullValues,
  removeNullRows,
  convertColumn,
  removeDuplicates,
  detectOutliers,
  removeOutliers,
  normalizeColumn,
  smoothColumn,
} from '../utils/dataCleaner';

interface DataCleanerProps {
  data: Record<string, any>[];
  columns: string[];
  onClean: (cleanedData: Record<string, any>[]) => void;
  activeTab: 'fillNull' | 'convert' | 'deduplicate' | 'outliers' | 'normalize' | 'smooth';
  className?: string;
}

const fillMethodOptions: { value: FillMethod | 'remove'; label: string; icon: React.ReactNode }[] = [
  { value: 'remove', label: '删除空值行', icon: <Trash2 className="w-4 h-4" /> },
  { value: 'forward', label: '向上填充', icon: <ArrowUp className="w-4 h-4" /> },
  { value: 'backward', label: '向下填充', icon: <ArrowDown className="w-4 h-4" /> },
  { value: 'linear', label: '线性插值', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'mean', label: '均值填充', icon: <Hash className="w-4 h-4" /> },
  { value: 'median', label: '中位数填充', icon: <Hash className="w-4 h-4" /> },
  { value: 'zero', label: '填充为0', icon: <Hash className="w-4 h-4" /> },
  { value: 'custom', label: '自定义值', icon: <Type className="w-4 h-4" /> },
];

const conversionOptions: { value: ConversionType; label: string }[] = [
  { value: 'textToNumber', label: '文本 → 数字' },
  { value: 'numberToText', label: '数字 → 文本' },
  { value: 'toDate', label: '转换为日期' },
  { value: 'toText', label: '转换为文本' },
];

const normalizeMethodOptions: { value: NormalizeMethod; label: string; description: string }[] = [
  { value: 'minMax', label: 'Min-Max归一化', description: '缩放到 [0, 1] 范围' },
  { value: 'zScore', label: 'Z-Score标准化', description: '均值为0，标准差为1' },
  { value: 'decimal', label: '小数定标', description: '按数量级缩放' },
  { value: 'log', label: '对数变换', description: '取自然对数（仅正数）' },
];

const smoothMethodOptions: { value: SmoothMethod; label: string; description: string; hasCoefficient: boolean; coefficientLabel?: string; coefficients?: { name: string; label: string; min?: number; max?: number; step?: number; default: number }[] }[] = [
  { value: 'movingAverage', label: '移动平均', description: '使用滑动窗口计算平均值', hasCoefficient: true, coefficientLabel: '窗口大小' },
  { value: 'exponential', label: '一次指数平滑', description: '使用指数加权移动平均', hasCoefficient: true, coefficientLabel: '平滑系数 α (0-1)', coefficients: [{ name: 'alpha', label: '平滑系数 α', min: 0.01, max: 0.99, step: 0.01, default: 0.3 }] },
  { value: 'doubleExponential', label: '二次指数平滑', description: 'Holt双参数指数平滑，适用于有趋势的数据', hasCoefficient: true, coefficientLabel: '平滑系数', coefficients: [{ name: 'alpha', label: '水平平滑系数 α', min: 0.01, max: 0.99, step: 0.01, default: 0.3 }, { name: 'beta', label: '趋势平滑系数 β', min: 0.01, max: 0.99, step: 0.01, default: 0.1 }] },
  { value: 'tripleExponential', label: '三次指数平滑', description: 'Holt-Winters方法，适用于有趋势和季节性的数据', hasCoefficient: true, coefficientLabel: '平滑系数', coefficients: [{ name: 'alpha', label: '水平平滑系数 α', min: 0.01, max: 0.99, step: 0.01, default: 0.3 }, { name: 'beta', label: '趋势平滑系数 β', min: 0.01, max: 0.99, step: 0.01, default: 0.1 }, { name: 'gamma', label: '季节平滑系数 γ', min: 0.01, max: 0.99, step: 0.01, default: 0.1 }, { name: 'period', label: '季节周期', min: 2, step: 1, default: 4 }] },
  { value: 'dampedExponential', label: '带阻尼趋势的指数平滑', description: '适用于趋势逐渐减弱的数据', hasCoefficient: true, coefficientLabel: '平滑系数', coefficients: [{ name: 'alpha', label: '水平平滑系数 α', min: 0.01, max: 0.99, step: 0.01, default: 0.3 }, { name: 'beta', label: '趋势平滑系数 β', min: 0.01, max: 0.99, step: 0.01, default: 0.1 }, { name: 'phi', label: '阻尼系数 φ (0-1)', min: 0.01, max: 0.99, step: 0.01, default: 0.9 }] },
  { value: 'gaussian', label: '高斯平滑', description: '使用高斯核进行平滑', hasCoefficient: true, coefficientLabel: '标准差 (σ)' },
  { value: 'savitzkyGolay', label: 'Savitzky-Golay', description: '多项式拟合平滑', hasCoefficient: true, coefficientLabel: '窗口大小 (奇数)' },
];

const DataCleaner: React.FC<DataCleanerProps> = ({
  data,
  columns,
  onClean,
  activeTab,
  className = '',
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [fillMethod, setFillMethod] = useState<FillMethod | 'remove'>('forward');
  const [customValue, setCustomValue] = useState<string>('');
  const [conversionType, setConversionType] = useState<ConversionType>('textToNumber');
  const [outlierThreshold, setOutlierThreshold] = useState<number>(1.5);
  const [normalizeMethod, setNormalizeMethod] = useState<NormalizeMethod>('minMax');
  const [smoothMethod, setSmoothMethod] = useState<SmoothMethod>('movingAverage');
  const [smoothCoefficient, setSmoothCoefficient] = useState<number>(5);
  const [smoothAlpha, setSmoothAlpha] = useState<number>(0.3);
  const [smoothBeta, setSmoothBeta] = useState<number>(0.1);
  const [smoothGamma, setSmoothGamma] = useState<number>(0.1);
  const [smoothPhi, setSmoothPhi] = useState<number>(0.9);
  const [smoothPeriod, setSmoothPeriod] = useState<number>(4);
  const [smoothPolynomialOrder, setSmoothPolynomialOrder] = useState<number>(2);
  const [smoothOutputColumnName, setSmoothOutputColumnName] = useState<string>('smoothed');
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null);
  const [fullProcessedData, setFullProcessedData] = useState<Record<string, any>[] | null>(null);
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const numericColumns = useMemo(() => {
    return columns.filter(col => {
      const values = data.slice(0, 100).map(row => row[col]);
      const numericCount = values.filter(v => typeof v === 'number' && !isNaN(v)).length;
      return numericCount > values.length * 0.5;
    });
  }, [data, columns]);

  const columnStats = useMemo(() => {
    if (selectedColumns.length === 0) return null;
    return getColumnStats(data, selectedColumns[0]);
  }, [data, selectedColumns]);

  const outlierInfo = useMemo(() => {
    if (selectedColumns.length === 0) return null;
    return detectOutliers(data, selectedColumns[0], outlierThreshold);
  }, [data, selectedColumns, outlierThreshold]);

  const toggleColumn = useCallback((col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  }, []);

  const selectAllColumns = useCallback(() => {
    if (activeTab === 'fillNull' || activeTab === 'convert') {
      setSelectedColumns([...columns]);
    } else if (activeTab === 'normalize' || activeTab === 'outliers' || activeTab === 'smooth') {
      setSelectedColumns([...numericColumns]);
    }
  }, [columns, numericColumns, activeTab]);

  const clearSelection = useCallback(() => {
    setSelectedColumns([]);
  }, []);

  const handleFillNull = useCallback(() => {
    if (selectedColumns.length === 0) return;
    
    let result = [...data];
    let totalModified = 0;
    let totalRemoved = 0;

    for (const column of selectedColumns) {
      if (fillMethod === 'remove') {
        const removeResult = removeNullRows(result, [column]);
        result = removeResult.data;
        totalRemoved += removeResult.removedCount;
      } else {
        const options: FillNullOptions = {
          method: fillMethod as FillMethod,
          customValue: fillMethod === 'custom' ? customValue : undefined,
        };
        const fillResult = fillNullValues(result, column, options);
        result = fillResult.data;
        totalModified += fillResult.modifiedCount;
      }
    }

    setFullProcessedData(result);
    setPreviewData(result.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: fillMethod === 'remove' 
        ? `已删除 ${totalRemoved} 行空值数据` 
        : `已填充 ${totalModified} 个空值单元格`,
    });
  }, [data, selectedColumns, fillMethod, customValue]);

  const handleConvert = useCallback(() => {
    if (selectedColumns.length === 0) return;
    
    let result = [...data];
    let totalModified = 0;

    for (const column of selectedColumns) {
      const options: ConversionOptions = { type: conversionType };
      const convertResult = convertColumn(result, column, options);
      result = convertResult.data;
      totalModified += convertResult.modifiedCount;
    }

    setFullProcessedData(result);
    setPreviewData(result.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已转换 ${totalModified} 个单元格`,
    });
  }, [data, selectedColumns, conversionType]);

  const handleDeduplicate = useCallback(() => {
    const result = removeDuplicates(data, columns);
    setFullProcessedData(result.data);
    setPreviewData(result.data.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已删除 ${result.removedCount} 行重复数据`,
    });
  }, [data, columns]);

  const handleRemoveOutliers = useCallback(() => {
    if (selectedColumns.length === 0) return;
    
    let result = [...data];
    let totalRemoved = 0;

    for (const column of selectedColumns) {
      const outlierResult = removeOutliers(result, column, outlierThreshold);
      result = outlierResult.data;
      totalRemoved += outlierResult.removedCount;
    }

    setFullProcessedData(result);
    setPreviewData(result.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已删除 ${totalRemoved} 行异常值数据`,
    });
  }, [data, selectedColumns, outlierThreshold]);

  const handleNormalize = useCallback(() => {
    if (selectedColumns.length === 0) return;
    
    let result = [...data];
    let totalModified = 0;
    const statsList: Array<{ min?: number; max?: number }> = [];

    for (const column of selectedColumns) {
      const options: NormalizeOptions = { method: normalizeMethod };
      const normalizeResult = normalizeColumn(result, column, options);
      result = normalizeResult.data;
      totalModified += normalizeResult.modifiedCount;
      if (normalizeResult.stats.min !== undefined) {
        statsList.push(normalizeResult.stats);
      }
    }

    setFullProcessedData(result);
    setPreviewData(result.slice(0, 50));
    
    const methodNames: Record<NormalizeMethod, string> = {
      minMax: 'Min-Max归一化',
      zScore: 'Z-Score标准化',
      decimal: '小数定标',
      log: '对数变换',
    };
    
    let message = `${methodNames[normalizeMethod]}完成，已处理 ${totalModified} 个单元格`;
    if (statsList.length > 0) {
      const minVal = Math.min(...statsList.map(s => s.min ?? Infinity));
      const maxVal = Math.max(...statsList.map(s => s.max ?? -Infinity));
      if (minVal !== Infinity && maxVal !== -Infinity) {
        message += ` (原范围: ${minVal.toFixed(2)} ~ ${maxVal.toFixed(2)})`;
      }
    }
    
    setOperationResult({ type: 'success', message });
  }, [data, selectedColumns, normalizeMethod]);

  const handleSmooth = useCallback(() => {
    if (selectedColumns.length === 0) return;

    let result = [...data];
    const outputColumns: string[] = [];

    for (const column of selectedColumns) {
      const outputCol = `${smoothOutputColumnName}_${column}`;
      const options: SmoothOptions = {
        method: smoothMethod,
        windowSize: smoothMethod === 'movingAverage' ? smoothCoefficient : smoothMethod === 'savitzkyGolay' ? smoothCoefficient : smoothMethod === 'tripleExponential' ? smoothPeriod : undefined,
        alpha: ['exponential', 'doubleExponential', 'tripleExponential', 'dampedExponential'].includes(smoothMethod) ? smoothAlpha : undefined,
        beta: ['doubleExponential', 'tripleExponential', 'dampedExponential'].includes(smoothMethod) ? smoothBeta : undefined,
        gamma: smoothMethod === 'tripleExponential' ? smoothGamma : undefined,
        phi: smoothMethod === 'dampedExponential' ? smoothPhi : undefined,
        sigma: smoothMethod === 'gaussian' ? smoothCoefficient : undefined,
        polynomialOrder: smoothMethod === 'savitzkyGolay' ? smoothPolynomialOrder : undefined,
        outputColumn: outputCol,
      };

      const smoothResult = smoothColumn(result, column, options);
      result = smoothResult.data;
      outputColumns.push(outputCol);
    }

    setFullProcessedData(result);
    setPreviewData(result.slice(0, 50));

    const methodNames: Record<SmoothMethod, string> = {
      movingAverage: '移动平均',
      exponential: '一次指数平滑',
      doubleExponential: '二次指数平滑',
      tripleExponential: '三次指数平滑',
      dampedExponential: '带阻尼趋势的指数平滑',
      gaussian: '高斯平滑',
      savitzkyGolay: 'Savitzky-Golay',
    };

    const message = `${methodNames[smoothMethod]}完成，已为 ${selectedColumns.length} 列生成平滑数据，新列: ${outputColumns.slice(0, 3).join(', ')}${outputColumns.length > 3 ? '...' : ''}`;

    setOperationResult({ type: 'success', message });
  }, [data, selectedColumns, smoothMethod, smoothCoefficient, smoothAlpha, smoothBeta, smoothGamma, smoothPhi, smoothPeriod, smoothPolynomialOrder, smoothOutputColumnName]);

  const handleApply = useCallback(() => {
    if (fullProcessedData) {
      onClean(fullProcessedData);
      setPreviewData(null);
      setFullProcessedData(null);
      setOperationResult(null);
    }
  }, [fullProcessedData, onClean]);

  const availableColumns = activeTab === 'normalize' || activeTab === 'outliers' || activeTab === 'smooth' 
    ? numericColumns 
    : columns;

  return (
    <div className={`space-y-4 ${className}`}>
      {(activeTab === 'fillNull' || activeTab === 'convert' || activeTab === 'normalize' || activeTab === 'outliers' || activeTab === 'smooth') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              选择列 {activeTab === 'normalize' || activeTab === 'outliers' || activeTab === 'smooth' ? '(仅数值列)' : ''}
            </label>
            <div className="flex space-x-2">
              <button 
                onClick={selectAllColumns}
                className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-surface-hover)' }}
              >
                全选
              </button>
              <button 
                onClick={clearSelection}
                className="text-xs px-2 py-1 rounded"
                style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-hover)' }}
              >
                清除
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 p-3 rounded-xl border max-h-32 overflow-y-auto scrollbar-thin" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            {availableColumns.map((col) => (
              <button
                key={col}
                onClick={() => toggleColumn(col)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: selectedColumns.includes(col) ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                  color: selectedColumns.includes(col) ? '#fff' : 'var(--color-text)',
                  border: `1px solid ${selectedColumns.includes(col) ? 'var(--color-primary)' : 'var(--color-border)'}`
                }}
              >
                {col}
              </button>
            ))}
          </div>
          {selectedColumns.length > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              已选择 {selectedColumns.length} 列
            </p>
          )}
        </div>
      )}

      {activeTab === 'fillNull' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>填充方式</label>
            <div className="grid grid-cols-2 gap-2">
              {fillMethodOptions.map((option) => (
                <label 
                  key={option.value} 
                  className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl border transition-colors"
                  style={{
                    backgroundColor: fillMethod === option.value ? 'rgba(var(--color-primary-rgb, 94, 129, 172), 0.2)' : 'var(--color-surface-hover)',
                    borderColor: fillMethod === option.value ? 'var(--color-accent)' : 'var(--color-border)'
                  }}
                  onMouseEnter={(e) => {
                    if (fillMethod !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (fillMethod !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="fillMethod"
                    value={option.value}
                    checked={fillMethod === option.value}
                    onChange={() => setFillMethod(option.value as FillMethod | 'remove')}
                    className="hidden"
                  />
                  <span style={{ color: fillMethod === option.value ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                    {option.icon}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {fillMethod === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>自定义填充值</label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="输入填充值..."
                className="input"
              />
            </div>
          )}

          {columnStats && columnStats.nullCount !== undefined && columnStats.nullCount > 0 && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                当前列 <strong>{selectedColumns[0]}</strong> 有 <strong style={{ color: 'var(--color-warning)' }}>{columnStats.nullCount}</strong> 个空值
              </p>
            </div>
          )}

          <button onClick={handleFillNull} className="btn btn-primary w-full" disabled={selectedColumns.length === 0}>
            预览填充结果
          </button>
        </div>
      )}

      {activeTab === 'convert' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>转换类型</label>
            <div className="space-y-2">
              {conversionOptions.map((option) => (
                <label 
                  key={option.value} 
                  className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border transition-colors"
                  style={{
                    backgroundColor: conversionType === option.value ? 'rgba(var(--color-primary-rgb, 94, 129, 172), 0.2)' : 'var(--color-surface-hover)',
                    borderColor: conversionType === option.value ? 'var(--color-accent)' : 'var(--color-border)'
                  }}
                  onMouseEnter={(e) => {
                    if (conversionType !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (conversionType !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="conversionType"
                    value={option.value}
                    checked={conversionType === option.value}
                    onChange={() => setConversionType(option.value)}
                    className="hidden"
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleConvert} className="btn btn-primary w-full" disabled={selectedColumns.length === 0}>
            预览转换结果
          </button>
        </div>
      )}

      {activeTab === 'deduplicate' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              数据去重将删除所有列值完全相同的行，保留第一个出现的行。
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
              当前数据: {data.length} 行
            </p>
          </div>

          <button onClick={handleDeduplicate} className="btn btn-primary w-full">
            预览去重结果
          </button>
        </div>
      )}

      {activeTab === 'outliers' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
              异常值阈值 (IQR倍数)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={outlierThreshold}
                onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium w-12 text-center" style={{ color: 'var(--color-text)' }}>
                {outlierThreshold.toFixed(1)}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              值越小，检测越严格
            </p>
          </div>

          {outlierInfo && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>检测到异常值</h4>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                当前列 <strong>{selectedColumns[0]}</strong> 检测到 <strong style={{ color: 'var(--color-warning)' }}>{outlierInfo.indices.length}</strong> 个异常值
              </p>
            </div>
          )}

          <button onClick={handleRemoveOutliers} className="btn btn-secondary w-full" disabled={selectedColumns.length === 0}>
            预览删除异常值
          </button>
        </div>
      )}

      {activeTab === 'normalize' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>归一化方法</label>
            <div className="space-y-2">
              {normalizeMethodOptions.map((option) => (
                <label 
                  key={option.value} 
                  className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl border transition-colors"
                  style={{
                    backgroundColor: normalizeMethod === option.value ? 'rgba(var(--color-primary-rgb, 94, 129, 172), 0.2)' : 'var(--color-surface-hover)',
                    borderColor: normalizeMethod === option.value ? 'var(--color-accent)' : 'var(--color-border)'
                  }}
                  onMouseEnter={(e) => {
                    if (normalizeMethod !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (normalizeMethod !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="normalizeMethod"
                    value={option.value}
                    checked={normalizeMethod === option.value}
                    onChange={() => setNormalizeMethod(option.value)}
                    className="mt-1"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{option.label}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {columnStats && columnStats.min !== undefined && columnStats.max !== undefined && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>当前列统计</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>最小值:</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.min.toFixed(2)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>最大值:</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.max.toFixed(2)}</span>
                </div>
                {columnStats.mean !== undefined && (
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>均值:</span>
                    <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.mean.toFixed(2)}</span>
                  </div>
                )}
                {columnStats.median !== undefined && (
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>中位数:</span>
                    <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.median.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {normalizeMethod === 'log' && columnStats && columnStats.min !== undefined && columnStats.min < 0 && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(var(--color-warning-rgb, 235, 203, 139), 0.2)', borderColor: 'var(--color-warning)' }}>
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                <p className="text-sm" style={{ color: 'var(--color-warning)' }}>
                  对数变换仅适用于正数，负值将被跳过
                </p>
              </div>
            </div>
          )}

          <button onClick={handleNormalize} className="btn btn-primary w-full" disabled={selectedColumns.length === 0}>
            预览归一化结果
          </button>
        </div>
      )}

      {activeTab === 'smooth' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>平滑方法</label>
            <div className="space-y-2">
              {smoothMethodOptions.map((option) => (
                <label 
                  key={option.value} 
                  className="flex items-start space-x-3 cursor-pointer p-3 rounded-xl border transition-colors"
                  style={{
                    backgroundColor: smoothMethod === option.value ? 'rgba(var(--color-primary-rgb, 94, 129, 172), 0.2)' : 'var(--color-surface-hover)',
                    borderColor: smoothMethod === option.value ? 'var(--color-accent)' : 'var(--color-border)'
                  }}
                  onMouseEnter={(e) => {
                    if (smoothMethod !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (smoothMethod !== option.value) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="smoothMethod"
                    value={option.value}
                    checked={smoothMethod === option.value}
                    onChange={() => setSmoothMethod(option.value)}
                    className="mt-1"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{option.label}</span>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
              平滑参数
            </label>
            
            {smoothMethod === 'movingAverage' && (
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>窗口大小</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={smoothCoefficient}
                  onChange={(e) => setSmoothCoefficient(parseInt(e.target.value) || 5)}
                  className="input"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  窗口大小越大，平滑程度越高
                </p>
              </div>
            )}

            {smoothMethod === 'exponential' && (
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>平滑系数 α (0-1)</label>
                <input
                  type="number"
                  min={0.01}
                  max={0.99}
                  step={0.01}
                  value={smoothAlpha}
                  onChange={(e) => setSmoothAlpha(parseFloat(e.target.value) || 0.3)}
                  className="input"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  系数越接近1，平滑程度越低（响应更快）
                </p>
              </div>
            )}

            {smoothMethod === 'doubleExponential' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>水平平滑系数 α (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothAlpha}
                    onChange={(e) => setSmoothAlpha(parseFloat(e.target.value) || 0.3)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>趋势平滑系数 β (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothBeta}
                    onChange={(e) => setSmoothBeta(parseFloat(e.target.value) || 0.1)}
                    className="input"
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  二次指数平滑适用于有趋势的数据
                </p>
              </div>
            )}

            {smoothMethod === 'tripleExponential' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>水平平滑系数 α (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothAlpha}
                    onChange={(e) => setSmoothAlpha(parseFloat(e.target.value) || 0.3)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>趋势平滑系数 β (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothBeta}
                    onChange={(e) => setSmoothBeta(parseFloat(e.target.value) || 0.1)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>季节平滑系数 γ (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothGamma}
                    onChange={(e) => setSmoothGamma(parseFloat(e.target.value) || 0.1)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>季节周期</label>
                  <input
                    type="number"
                    min={2}
                    step={1}
                    value={smoothPeriod}
                    onChange={(e) => setSmoothPeriod(parseInt(e.target.value) || 4)}
                    className="input"
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Holt-Winters方法适用于有趋势和季节性的数据
                </p>
              </div>
            )}

            {smoothMethod === 'dampedExponential' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>水平平滑系数 α (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothAlpha}
                    onChange={(e) => setSmoothAlpha(parseFloat(e.target.value) || 0.3)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>趋势平滑系数 β (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothBeta}
                    onChange={(e) => setSmoothBeta(parseFloat(e.target.value) || 0.1)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>阻尼系数 φ (0-1)</label>
                  <input
                    type="number"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={smoothPhi}
                    onChange={(e) => setSmoothPhi(parseFloat(e.target.value) || 0.9)}
                    className="input"
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  阻尼系数越接近1，趋势衰减越慢；适用于趋势逐渐减弱的数据
                </p>
              </div>
            )}

            {smoothMethod === 'gaussian' && (
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>标准差 (σ)</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={smoothCoefficient}
                  onChange={(e) => setSmoothCoefficient(parseFloat(e.target.value) || 1)}
                  className="input"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  标准差越大，平滑范围越广
                </p>
              </div>
            )}

            {smoothMethod === 'savitzkyGolay' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>窗口大小 (奇数)</label>
                  <input
                    type="number"
                    min={3}
                    step={2}
                    value={smoothCoefficient}
                    onChange={(e) => setSmoothCoefficient(parseInt(e.target.value) || 5)}
                    className="input"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    窗口大小必须是奇数（如3, 5, 7...）
                  </p>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>多项式阶数</label>
                  <input
                    type="number"
                    min={1}
                    max={smoothCoefficient - 1}
                    value={smoothPolynomialOrder}
                    onChange={(e) => setSmoothPolynomialOrder(parseInt(e.target.value) || 2)}
                    className="input"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    多项式阶数必须小于窗口大小
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
              新列名前缀
            </label>
            <input
              type="text"
              value={smoothOutputColumnName}
              onChange={(e) => setSmoothOutputColumnName(e.target.value)}
              placeholder="输入新列名前缀..."
              className="input"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              平滑后的数据将保存为新列，列名格式: {smoothOutputColumnName}_原列名
            </p>
          </div>

          {columnStats && columnStats.min !== undefined && columnStats.max !== undefined && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>当前列统计</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>最小值:</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.min.toFixed(2)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>最大值:</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.max.toFixed(2)}</span>
                </div>
                {columnStats.mean !== undefined && (
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>均值:</span>
                    <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.mean.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button onClick={handleSmooth} className="btn btn-primary w-full" disabled={selectedColumns.length === 0 || !smoothOutputColumnName.trim()}>
            预览平滑结果
          </button>
        </div>
      )}

      {operationResult && (
        <div 
          className="p-4 rounded-xl flex items-center justify-between"
          style={{ 
            backgroundColor: operationResult.type === 'success' ? 'rgba(var(--color-success-rgb, 163, 190, 140), 0.2)' : 'rgba(var(--color-error-rgb, 191, 97, 106), 0.2)',
            borderColor: operationResult.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
            border: '1px solid'
          }}
        >
          <div className="flex items-center space-x-2">
            {operationResult.type === 'success' ? (
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
            ) : (
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
            )}
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>{operationResult.message}</span>
          </div>
          <button 
            onClick={() => setOperationResult(null)}
            className="p-1 rounded-lg hover:bg-black/10"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
      )}

      {previewData && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>预览结果 (前50行)</h4>
            <button 
              onClick={() => setPreviewData(null)} 
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
            >
              清除预览
            </button>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
            <div className="overflow-auto scrollbar-thin" style={{ maxHeight: '300px' }}>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th 
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider sticky left-0 z-20 w-12"
                      style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-hover)' }}
                    >
                      #
                    </th>
                    {(() => {
                      const allColumns = previewData.length > 0 ? Object.keys(previewData[0]) : columns;
                      return allColumns.map((col) => {
                        const isOriginalColumn = columns.includes(col);
                        const isSelected = selectedColumns.includes(col);
                        const isNewColumn = !isOriginalColumn;
                        return (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                            style={{
                              color: isNewColumn ? 'var(--color-success)' : (isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)'),
                              backgroundColor: isNewColumn ? 'rgba(var(--color-success-rgb, 163, 190, 140), 0.2)' : (isSelected ? 'var(--color-surface)' : 'var(--color-surface-hover)'),
                              width: `${100 / allColumns.length}%`,
                              maxWidth: '200px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={col}
                          >
                            {col.length > 15 ? col.substring(0, 15) + '...' : col}
                            {isNewColumn && <span className="ml-1 text-xs">(新)</span>}
                          </th>
                        );
                      });
                    })()}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
                  {previewData.slice(0, 50).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="transition-colors"
                      style={{ backgroundColor: rowIndex % 2 === 0 ? 'var(--color-background)' : 'var(--color-surface)' }}
                    >
                      <td 
                        className="px-3 py-2 text-xs font-mono sticky left-0 z-10"
                        style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-hover)' }}
                      >
                        {rowIndex + 1}
                      </td>
                      {(() => {
                        const allColumns = previewData.length > 0 ? Object.keys(previewData[0]) : columns;
                        return allColumns.map((col) => {
                          const isOriginalColumn = columns.includes(col);
                          const isSelected = selectedColumns.includes(col);
                          const isNewColumn = !isOriginalColumn;
                          return (
                            <td
                              key={col}
                              className="px-3 py-2 text-xs"
                              style={{ backgroundColor: isNewColumn ? 'rgba(var(--color-success-rgb, 163, 190, 140), 0.1)' : (isSelected ? 'var(--color-surface)' : 'transparent') }}
                            >
                              <span
                                className="block truncate"
                                style={{
                                  color: row[col] === null || row[col] === undefined 
                                    ? 'var(--color-text-tertiary)' 
                                    : (isNewColumn ? 'var(--color-success)' : 'var(--color-text)'),
                                  fontStyle: row[col] === null || row[col] === undefined ? 'italic' : 'normal'
                                }}
                                title={String(row[col] ?? '-')}
                              >
                                {String(row[col] ?? '-')}
                              </span>
                            </td>
                          );
                        });
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={handleApply} className="btn btn-primary w-full mt-3">
            应用清洗结果
          </button>
        </div>
      )}
    </div>
  );
};

export default DataCleaner;
