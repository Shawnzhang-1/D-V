import React, { useMemo } from 'react';
import { Table, Info } from 'lucide-react';
import { ParsedData } from '../utils/fileParser';

interface DataPreviewProps {
  data: ParsedData;
  selectedColumns?: string[];
  onColumnSelect?: (columns: string[]) => void;
  maxPreviewRows?: number;
  className?: string;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  data,
  selectedColumns = [],
  onColumnSelect,
  maxPreviewRows = 10,
  className = '',
}) => {
  const previewData = useMemo(() => {
    return data.data.slice(0, maxPreviewRows);
  }, [data.data, maxPreviewRows]);

  const columnStats = useMemo(() => {
    return data.headers.map((header) => {
      const values = data.data.map((row) => row[header]);
      const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');

      const types = new Set<string>();
      nonNullValues.forEach((v) => {
        if (typeof v === 'number') types.add('number');
        else if (typeof v === 'boolean') types.add('boolean');
        else if (v instanceof Date || (!isNaN(Date.parse(String(v))) && typeof v === 'string')) {
          types.add('date');
        } else {
          types.add('string');
        }
      });

      let dominantType: 'number' | 'string' | 'boolean' | 'date' | 'mixed' = 'string';
      if (types.size === 1) {
        dominantType = (Array.from(types)[0] as typeof dominantType) || 'string';
      } else if (types.size > 1) {
        dominantType = 'mixed';
      }

      const uniqueValues = new Set(nonNullValues.map((v) => String(v)));

      return {
        name: header,
        type: dominantType,
        nullCount: values.length - nonNullValues.length,
        uniqueCount: uniqueValues.size,
      };
    });
  }, [data]);

  const handleColumnToggle = (columnName: string) => {
    const newSelected = selectedColumns.includes(columnName)
      ? selectedColumns.filter((c) => c !== columnName)
      : [...selectedColumns, columnName];
    onColumnSelect?.(newSelected);
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'number':
        return { bg: 'rgba(var(--color-primary-rgb, 0, 113, 227), 0.15)', color: 'var(--color-primary)' };
      case 'string':
        return { bg: 'rgba(var(--color-success-rgb, 52, 199, 89), 0.15)', color: 'var(--color-success)' };
      case 'boolean':
        return { bg: 'rgba(var(--color-warning-rgb, 255, 149, 0), 0.15)', color: 'var(--color-warning)' };
      case 'date':
        return { bg: 'rgba(var(--color-accent-rgb, 0, 113, 227), 0.15)', color: 'var(--color-accent)' };
      default:
        return { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'number': return '数值';
      case 'string': return '文本';
      case 'boolean': return '布尔';
      case 'date': return '日期';
      default: return '混合';
    }
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-xl"
              style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-md)' }}
            >
              <Table className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>数据预览</h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>原始数据表格</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Info className="w-4 h-4" />
            <span>显示前 {previewData.length} 行 / 共 {data.totalCount.toLocaleString()} 行</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>列类型统计</h3>
          <div className="flex flex-wrap gap-2">
            {columnStats.map((stat) => {
              const isSelected = selectedColumns.includes(stat.name);
              const typeStyle = getTypeStyle(stat.type);
              return (
                <button
                  key={stat.name}
                  onClick={() => handleColumnToggle(stat.name)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-300 text-sm"
                  style={{
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-surface)' : 'var(--color-background)',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'none'
                  }}
                >
                  <span className="font-medium">{stat.name}</span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                  >
                    {getTypeLabel(stat.type)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <div className="overflow-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <th 
                    className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider sticky left-0 z-20 w-12"
                    style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-hover)' }}
                  >
                    #
                  </th>
                  {data.headers.map((header) => (
                    <th
                      key={header}
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                      style={{
                        color: selectedColumns.includes(header) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        backgroundColor: selectedColumns.includes(header) ? 'var(--color-surface)' : 'var(--color-surface-hover)',
                        width: `${100 / data.headers.length}%`,
                        maxWidth: '200px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={header}
                    >
                      {header.length > 15 ? header.substring(0, 15) + '...' : header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
                {previewData.map((row, rowIndex) => (
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
                    {data.headers.map((header) => {
                      const isSelected = selectedColumns.includes(header);
                      return (
                        <td
                          key={header}
                          className="px-3 py-2 text-xs"
                          style={{ backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent' }}
                        >
                          <span
                            className="block truncate"
                            style={{
                              color: row[header] === null || row[header] === undefined 
                                ? 'var(--color-text-tertiary)' 
                                : 'var(--color-text)',
                              fontStyle: row[header] === null || row[header] === undefined ? 'italic' : 'normal'
                            }}
                            title={formatCellValue(row[header])}
                          >
                            {formatCellValue(row[header])}
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

        {data.data.length > maxPreviewRows && (
          <div className="mt-3 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            还有 {(data.data.length - maxPreviewRows).toLocaleString()} 行数据未显示
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreview;
