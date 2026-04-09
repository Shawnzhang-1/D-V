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
        return { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' };
      case 'string':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'boolean':
        return { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' };
      case 'date':
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
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
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/25">
              <Table className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">数据预览</h2>
              <p className="text-xs text-gray-500">原始数据表格</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <Info className="w-4 h-4" />
            <span>显示前 {previewData.length} 行 / 共 {data.totalCount.toLocaleString()} 行</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">列类型统计</h3>
          <div className="flex flex-wrap gap-2">
            {columnStats.map((stat) => {
              const isSelected = selectedColumns.includes(stat.name);
              const typeStyle = getTypeStyle(stat.type);
              return (
                <button
                  key={stat.name}
                  onClick={() => handleColumnToggle(stat.name)}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-300 text-sm
                    ${isSelected
                      ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-lg shadow-violet-500/10'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-violet-200 hover:bg-violet-50/50'
                    }
                  `}
                >
                  <span className="font-medium">{stat.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                    {getTypeLabel(stat.type)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky left-0 z-10 w-12">
                    #
                  </th>
                  {data.headers.map((header) => (
                    <th
                      key={header}
                      className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                        selectedColumns.includes(header)
                          ? 'bg-violet-50 text-violet-700'
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={`transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-3 py-2 text-xs text-gray-400 font-mono bg-gray-50 sticky left-0">
                      {rowIndex + 1}
                    </td>
                    {data.headers.map((header) => {
                      const isSelected = selectedColumns.includes(header);
                      return (
                        <td
                          key={header}
                          className={`px-3 py-2 text-xs whitespace-nowrap ${isSelected ? 'bg-violet-50/50' : ''}`}
                        >
                          <span
                            className={`block truncate max-w-[150px] ${
                              row[header] === null || row[header] === undefined
                                ? 'text-gray-300 italic'
                                : 'text-gray-700'
                            }`}
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
          <div className="mt-3 text-center text-xs text-gray-400">
            还有 {(data.data.length - maxPreviewRows).toLocaleString()} 行数据未显示
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreview;
