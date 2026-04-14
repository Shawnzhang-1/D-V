import React, { useState, useMemo, useCallback } from 'react';
import { Eraser, Droplets, RefreshCw, ArrowUp, ArrowDown, TrendingUp, Hash, Type, Copy, AlertTriangle, CheckCircle, X } from 'lucide-react';
import {
  FillMethod,
  ConversionType,
  FillNullOptions,
  ConversionOptions,
  getColumnStats,
  fillNullValues,
  removeNullRows,
  convertColumn,
  removeDuplicates,
  detectOutliers,
  removeOutliers,
} from '../utils/dataCleaner';

interface DataCleanerProps {
  data: Record<string, any>[];
  columns: string[];
  onClean: (cleanedData: Record<string, any>[]) => void;
  className?: string;
}

const fillMethodOptions: { value: FillMethod; label: string; icon: React.ReactNode }[] = [
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

type CleaningTab = 'fillNull' | 'removeNull' | 'convert' | 'deduplicate' | 'outliers';

const DataCleaner: React.FC<DataCleanerProps> = ({
  data,
  columns,
  onClean,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<CleaningTab>('fillNull');
  const [selectedColumn, setSelectedColumn] = useState<string>(columns[0] || '');
  const [fillMethod, setFillMethod] = useState<FillMethod>('forward');
  const [customValue, setCustomValue] = useState<string>('');
  const [conversionType, setConversionType] = useState<ConversionType>('textToNumber');
  const [outlierThreshold, setOutlierThreshold] = useState<number>(1.5);
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null);
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const columnStats = useMemo(() => {
    if (!selectedColumn) return null;
    return getColumnStats(data, selectedColumn);
  }, [data, selectedColumn]);

  const outlierInfo = useMemo(() => {
    if (!selectedColumn) return null;
    return detectOutliers(data, selectedColumn, outlierThreshold);
  }, [data, selectedColumn, outlierThreshold]);

  const handleFillNull = useCallback(() => {
    if (!selectedColumn) return;
    
    const options: FillNullOptions = {
      method: fillMethod,
      customValue: fillMethod === 'custom' ? customValue : undefined,
    };
    
    const result = fillNullValues(data, selectedColumn, options);
    setPreviewData(result.data.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已填充 ${result.modifiedCount} 个空值单元格`,
    });
  }, [data, selectedColumn, fillMethod, customValue]);

  const handleRemoveNull = useCallback(() => {
    if (!selectedColumn) return;
    
    const result = removeNullRows(data, [selectedColumn]);
    setPreviewData(result.data.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已删除 ${result.removedCount} 行包含空值的数据`,
    });
  }, [data, selectedColumn]);

  const handleConvert = useCallback(() => {
    if (!selectedColumn) return;
    
    const options: ConversionOptions = {
      type: conversionType,
    };
    
    const result = convertColumn(data, selectedColumn, options);
    setPreviewData(result.data.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已转换 ${result.modifiedCount} 个单元格${result.errorCount > 0 ? `，${result.errorCount} 个转换失败` : ''}`,
    });
  }, [data, selectedColumn, conversionType]);

  const handleDeduplicate = useCallback(() => {
    const result = removeDuplicates(data, columns);
    setPreviewData(result.data.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已删除 ${result.removedCount} 行重复数据`,
    });
  }, [data, columns]);

  const handleRemoveOutliers = useCallback(() => {
    if (!selectedColumn) return;
    
    const result = removeOutliers(data, selectedColumn, outlierThreshold);
    setPreviewData(result.data.slice(0, 50));
    setOperationResult({
      type: 'success',
      message: `已删除 ${result.removedCount} 行异常值数据`,
    });
  }, [data, selectedColumn, outlierThreshold]);

  const handleApply = useCallback(() => {
    if (previewData) {
      onClean(previewData.concat(data.slice(previewData.length)));
      setOperationResult({
        type: 'success',
        message: '清洗结果已应用到数据',
      });
      setPreviewData(null);
    }
  }, [previewData, data, onClean]);

  const tabs: { id: CleaningTab; label: string; icon: React.ReactNode }[] = [
    { id: 'fillNull', label: '空值填充', icon: <Droplets className="w-4 h-4" /> },
    { id: 'removeNull', label: '删除空值', icon: <Eraser className="w-4 h-4" /> },
    { id: 'convert', label: '格式转换', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'deduplicate', label: '数据去重', icon: <Copy className="w-4 h-4" /> },
    { id: 'outliers', label: '异常值', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-xl"
            style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-md)' }}
          >
            <Eraser className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>数据清洗</h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>处理空值、格式转换、去重</p>
          </div>
        </div>
      </div>

      <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPreviewData(null); setOperationResult(null); }}
              className="flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2"
              style={{
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                backgroundColor: activeTab === tab.id ? 'var(--color-surface)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>选择列</label>
          <select
            value={selectedColumn}
            onChange={(e) => { setSelectedColumn(e.target.value); setPreviewData(null); setOperationResult(null); }}
            className="input select"
          >
            {columns.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        {columnStats && (
          <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>列统计</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>空值:</span>
                <span className="ml-1 font-medium" style={{ color: 'var(--color-error)' }}>{columnStats.nullCount}</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>唯一值:</span>
                <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.uniqueCount}</span>
              </div>
              {columnStats.min !== undefined && (
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>最小值:</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.min?.toFixed(2)}</span>
                </div>
              )}
              {columnStats.max !== undefined && (
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>最大值:</span>
                  <span className="ml-1 font-medium" style={{ color: 'var(--color-text)' }}>{columnStats.max?.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'fillNull' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>填充方式</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fillMethodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFillMethod(option.value)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl text-sm transition-colors border-2"
                    style={{
                      backgroundColor: fillMethod === option.value ? 'rgba(var(--color-primary-rgb, 94, 129, 172), 0.2)' : 'var(--color-surface-hover)',
                      color: fillMethod === option.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      borderColor: fillMethod === option.value ? 'var(--color-accent)' : 'transparent'
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
                    {option.icon}
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {fillMethod === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>自定义值</label>
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="input"
                  placeholder="输入填充值"
                />
              </div>
            )}

            <button onClick={handleFillNull} className="btn btn-primary w-full">
              预览填充结果
            </button>
          </div>
        )}

        {activeTab === 'removeNull' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(var(--color-warning-rgb, 235, 203, 139), 0.2)', borderColor: 'var(--color-warning)' }}>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
                <div>
                  <h4 className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>删除空值行</h4>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-warning)' }}>
                    将删除 "{selectedColumn}" 列中所有包含空值的行
                  </p>
                  {columnStats && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-warning)' }}>
                      预计删除: <span className="font-bold">{columnStats.nullCount}</span> 行
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button onClick={handleRemoveNull} className="btn btn-secondary w-full">
              预览删除结果
            </button>
          </div>
        )}

        {activeTab === 'convert' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>转换类型</label>
              <select
                value={conversionType}
                onChange={(e) => setConversionType(e.target.value as ConversionType)}
                className="input select"
              >
                {conversionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <button onClick={handleConvert} className="btn btn-primary w-full">
              预览转换结果
            </button>
          </div>
        )}

        {activeTab === 'deduplicate' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(var(--color-primary-rgb, 129, 161, 193), 0.2)', borderColor: 'var(--color-primary)' }}>
              <h4 className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>全行去重</h4>
              <p className="text-sm mt-1" style={{ color: 'var(--color-primary)' }}>
                将删除所有完全相同的行，保留第一次出现的行
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
                异常值阈值 (IQR倍数): {outlierThreshold}
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={outlierThreshold}
                onChange={(e) => setOutlierThreshold(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--color-border)', accentColor: 'var(--color-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                较小的值会识别更多异常值
              </p>
            </div>

            {outlierInfo && outlierInfo.indices.length > 0 && (
              <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(var(--color-warning-rgb, 235, 203, 139), 0.2)', borderColor: 'var(--color-warning)' }}>
                <h4 className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>检测到异常值</h4>
                <p className="text-sm mt-1" style={{ color: 'var(--color-warning)' }}>
                  发现 <span className="font-bold">{outlierInfo.indices.length}</span> 个异常值
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-warning)' }}>
                  正常范围: [{outlierInfo.lowerBound.toFixed(2)}, {outlierInfo.upperBound.toFixed(2)}]
                </p>
              </div>
            )}

            <button onClick={handleRemoveOutliers} className="btn btn-secondary w-full">
              预览删除异常值
            </button>
          </div>
        )}

        {operationResult && (
          <div 
            className="mt-4 p-4 rounded-xl border"
            style={{ 
              backgroundColor: operationResult.type === 'success' ? 'rgba(var(--color-success-rgb, 163, 190, 140), 0.2)' : 'rgba(var(--color-error-rgb, 191, 97, 106), 0.2)',
              borderColor: operationResult.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'
            }}
          >
            <div className="flex items-center space-x-2">
              {operationResult.type === 'success' ? (
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
              ) : (
                <X className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
              )}
              <span 
                className="text-sm font-medium"
                style={{ color: operationResult.type === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}
              >
                {operationResult.message}
              </span>
            </div>
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
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                          style={{
                            color: col === selectedColumn ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            backgroundColor: col === selectedColumn ? 'var(--color-surface)' : 'var(--color-surface-hover)',
                            width: `${100 / columns.length}%`,
                            maxWidth: '200px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={col}
                        >
                          {col.length > 15 ? col.substring(0, 15) + '...' : col}
                        </th>
                      ))}
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
                        {columns.map((col) => {
                          const isSelected = col === selectedColumn;
                          return (
                            <td
                              key={col}
                              className="px-3 py-2 text-xs"
                              style={{ backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent' }}
                            >
                              <span
                                className="block truncate"
                                style={{
                                  color: row[col] === null || row[col] === undefined 
                                    ? 'var(--color-text-tertiary)' 
                                    : 'var(--color-text)',
                                  fontStyle: row[col] === null || row[col] === undefined ? 'italic' : 'normal'
                                }}
                                title={String(row[col] ?? '-')}
                              >
                                {String(row[col] ?? '-')}
                              </span>
                            </td>
                          );
                        })}
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
    </div>
  );
};

export default DataCleaner;
