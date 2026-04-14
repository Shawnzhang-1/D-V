import { useState, useCallback, useMemo } from 'react';
import { Download, RefreshCw, FileSpreadsheet, BarChart2, Sparkles, Zap, FileImage, Image, FileText, Settings2, Filter, Eraser, Eye, Check, Database, LineChart, Table2, ChevronDown, ChevronUp } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DataPreview from './components/DataPreview';
import DataFilter from './components/DataFilter';
import DataCleaner from './components/DataCleaner';
import Chart from './components/Chart';
import ChartConfigPanel, { ChartConfig, DEFAULT_CONFIG } from './components/ChartConfig';
import MultiSelect from './components/MultiSelect';
import ThemeSwitcher from './components/ThemeSwitcher';
import { ThemeProvider } from './contexts/ThemeContext';
import { parseFile, previewFile, ParsedData, sampleDataByRange } from './utils/fileParser';
import { analyzeAllColumns, ColumnMeta } from './utils/dataFilter';
import { exportChartAsSvg, exportChartAsPng, exportChartAsPdf } from './utils/exportSvg';

type ActiveDataTab = 'filter' | 'clean' | 'settings';

interface PreviewState {
  rows: any[][];
  totalRows: number;
  file: File;
}

function App() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [filteredData, setFilteredData] = useState<Record<string, any>[] | null>(null);
  const [cleanedData, setCleanedData] = useState<Record<string, any>[] | null>(null);
  const [columnMetas, setColumnMetas] = useState<ColumnMeta[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [xAxisColumn, setXAxisColumn] = useState<string>('');
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [dataStartRow, setDataStartRow] = useState<number>(2);
  const [displayStartRow, setDisplayStartRow] = useState<number>(0);
  const [displayEndRow, setDisplayEndRow] = useState<number>(200);
  const [maxDisplayRows, setMaxDisplayRows] = useState<number>(200);
  const [activeDataTab, setActiveDataTab] = useState<ActiveDataTab>('filter');
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isDataExpanded, setIsDataExpanded] = useState(true);
  const [isDataProcessExpanded, setIsDataProcessExpanded] = useState(true);

  const handleFilePreview = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const preview = await previewFile(file, 20);
      setPreviewState({ ...preview, file });
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件预览失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmParse = useCallback(async () => {
    if (!previewState) return;
    
    setIsLoading(true);
    setError(null);
    setShowPreview(false);
    
    try {
      const data = await parseFile(previewState.file, {
        headerRow,
        dataStartRow,
        onProgress: (progress) => {
          console.log(`解析进度: ${progress}%`);
        },
      });
      
      setParsedData(data);
      setFilteredData(data.data);
      setCleanedData(null);
      const metas = analyzeAllColumns(data.data, data.headers);
      setColumnMetas(metas);
      setSelectedColumns(data.headers.slice(0, Math.min(3, data.headers.length)));
      setXAxisColumn(data.headers[0] || '');
      setYAxisColumns(data.headers.slice(1, Math.min(4, data.headers.length)));
      setChartConfig(DEFAULT_CONFIG);
      setPreviewState(null);
      setDisplayStartRow(0);
      setDisplayEndRow(200);
      setMaxDisplayRows(200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
      setParsedData(null);
      setFilteredData(null);
      setCleanedData(null);
      setSelectedColumns([]);
    } finally {
      setIsLoading(false);
    }
  }, [previewState, headerRow, dataStartRow]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (parsedData) {
      setParsedData(null);
      setFilteredData(null);
      setCleanedData(null);
      setColumnMetas([]);
      setSelectedColumns([]);
      setXAxisColumn('');
      setYAxisColumns([]);
      setChartConfig(DEFAULT_CONFIG);
      setError(null);
      setDisplayStartRow(0);
      setDisplayEndRow(200);
      setMaxDisplayRows(200);
    }
    await handleFilePreview(file);
  }, [parsedData, handleFilePreview]);

  const handleColumnSelect = useCallback((columns: string[]) => {
    setSelectedColumns(columns);
  }, []);

  const handleFilter = useCallback((data: Record<string, any>[]) => {
    setFilteredData(data);
    setCleanedData(null);
  }, []);

  const handleClean = useCallback((data: Record<string, any>[]) => {
    setCleanedData(data);
  }, []);

  const workingData = cleanedData || filteredData || parsedData?.data || [];

  const chartData = useMemo(() => {
    if (!workingData || workingData.length === 0 || !xAxisColumn || yAxisColumns.length === 0) {
      return [];
    }

    const sampledData = sampleDataByRange(
      workingData,
      displayStartRow,
      displayEndRow,
      maxDisplayRows
    );

    return sampledData.map((row, index) => {
      const dataPoint: Record<string, string | number> = {};
      
      const xValue = row[xAxisColumn];
      if (typeof xValue === 'string' || typeof xValue === 'number') {
        dataPoint.name = String(xValue);
      } else {
        dataPoint.name = `行 ${displayStartRow + index + 1}`;
      }
      
      yAxisColumns.forEach((col) => {
        const value = row[col];
        if (typeof value === 'number') {
          dataPoint[col] = value;
        } else if (value !== null && value !== undefined) {
          const numValue = parseFloat(String(value));
          dataPoint[col] = isNaN(numValue) ? 0 : numValue;
        } else {
          dataPoint[col] = 0;
        }
      });

      return dataPoint;
    });
  }, [workingData, xAxisColumn, yAxisColumns, displayStartRow, displayEndRow, maxDisplayRows]);

  const numericColumns = useMemo(() => {
    if (!parsedData) return [];
    
    return parsedData.headers.filter((header) => {
      const values = parsedData.data.slice(0, 100).map((row) => row[header]);
      const numericCount = values.filter(
        (v) => typeof v === 'number' || (!isNaN(parseFloat(String(v))) && v !== null && v !== '')
      ).length;
      return numericCount > values.length * 0.5;
    });
  }, [parsedData]);

  const handleExportData = useCallback(() => {
    if (!workingData || workingData.length === 0 || !parsedData) return;

    const csvContent = [
      parsedData.headers.join(','),
      ...workingData.map((row) =>
        parsedData.headers.map((h) => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return String(value);
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'exported_data.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }, [workingData, parsedData]);

  const handleReset = useCallback(() => {
    setParsedData(null);
    setFilteredData(null);
    setCleanedData(null);
    setColumnMetas([]);
    setSelectedColumns([]);
    setXAxisColumn('');
    setYAxisColumns([]);
    setChartConfig(DEFAULT_CONFIG);
    setError(null);
    setHeaderRow(1);
    setDataStartRow(2);
    setDisplayStartRow(0);
    setDisplayEndRow(200);
    setMaxDisplayRows(200);
    setPreviewState(null);
    setShowPreview(false);
  }, []);

  const handleChartTypeChange = useCallback((type: string) => {
    setChartConfig(prev => ({ ...prev, chartType: type as any }));
  }, []);

  const chartColors = useMemo(() => {
    return chartConfig.useCustomColors ? chartConfig.customColors : chartConfig.colorScheme.colors;
  }, [chartConfig]);

  const dataTabs: { id: ActiveDataTab; label: string; icon: React.ReactNode }[] = [
    { id: 'filter', label: '数据筛选', icon: <Filter className="w-4 h-4" /> },
    { id: 'clean', label: '数据清洗', icon: <Eraser className="w-4 h-4" /> },
    { id: 'settings', label: '解析设置', icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <ThemeProvider>
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl shadow-lg" style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-lg)' }}>
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                  数据可视化
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Data Visualization</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ThemeSwitcher />
              
              {parsedData && (
                <>
                  <button
                    onClick={handleExportData}
                    className="btn btn-secondary"
                  >
                    <Download className="w-4 h-4" />
                    <span>导出数据</span>
                  </button>
                  <div className="relative group">
                    <button className="btn btn-primary">
                      <Download className="w-4 h-4" />
                      <span>导出图表</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1 py-2 rounded-xl shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[160px]" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                      <button
                        onClick={() => exportChartAsSvg({ fileName: 'chart.svg', title: chartConfig.title })}
                        className="w-full px-4 py-2 text-left text-sm flex items-center space-x-2"
                        style={{ color: 'var(--color-text)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; }}
                      >
                        <FileImage className="w-4 h-4" />
                        <span>SVG 矢量图</span>
                      </button>
                      <button
                        onClick={() => exportChartAsPng({ fileName: 'chart.png', title: chartConfig.title, quality: 2 })}
                        className="w-full px-4 py-2 text-left text-sm flex items-center space-x-2"
                        style={{ color: 'var(--color-text)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; }}
                      >
                        <Image className="w-4 h-4" />
                        <span>PNG 图片</span>
                      </button>
                      <button
                        onClick={() => exportChartAsPdf({ fileName: 'chart.pdf', title: chartConfig.title })}
                        className="w-full px-4 py-2 text-left text-sm flex items-center space-x-2"
                        style={{ color: 'var(--color-text)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; }}
                      >
                        <FileText className="w-4 h-4" />
                        <span>PDF 文档</span>
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="btn btn-ghost"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>重置</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {!parsedData ? (
          <div className="space-y-8 animate-fade-in">
            {showPreview && previewState ? (
              <div className="card p-6 animate-fade-in">
                <div className="flex items-center space-x-4 mb-6">
                  <div 
                    className="p-3 rounded-xl"
                    style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-lg)' }}
                  >
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>文件预览 - 选择列名行</h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>预览前 {previewState.rows.length} 行，确认列名所在行后点击确认解析</p>
                  </div>
                  <button
                    onClick={() => { setShowPreview(false); setPreviewState(null); }}
                    className="btn btn-ghost"
                  >
                    取消
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>列名所在行</label>
                    <input
                      type="number"
                      min="1"
                      max={previewState.rows.length}
                      value={headerRow}
                      onChange={(e) => setHeaderRow(Math.max(1, Math.min(previewState.rows.length, parseInt(e.target.value) || 1)))}
                      className="input"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>当前选中第 {headerRow} 行作为列名</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>数据开始行</label>
                    <input
                      type="number"
                      min="1"
                      value={dataStartRow}
                      onChange={(e) => setDataStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>从第 {dataStartRow} 行开始读取数据</p>
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <button
                      onClick={handleConfirmParse}
                      disabled={isLoading}
                      className="btn btn-primary w-full"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>解析中...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>确认解析</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="min-w-full" style={{ borderColor: 'var(--color-border-light)' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider sticky left-0" style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-hover)' }}>
                          行号
                        </th>
                        {previewState.rows[0]?.map((_: any, colIndex: number) => (
                          <th key={colIndex} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                            列 {colIndex + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ backgroundColor: 'var(--color-background)' }}>
                      {previewState.rows.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className="transition-colors"
                          style={{ 
                            backgroundColor: rowIndex === headerRow - 1 
                              ? 'var(--color-surface-hover)' 
                              : rowIndex >= dataStartRow - 1 
                                ? 'var(--color-surface)' 
                                : 'var(--color-background)',
                            borderTop: rowIndex === headerRow - 1 ? '2px solid var(--color-primary)' : '1px solid var(--color-border-light)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; }}
                          onMouseLeave={(e) => {
                            if (rowIndex === headerRow - 1) {
                              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                            } else if (rowIndex >= dataStartRow - 1) {
                              e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                            } else {
                              e.currentTarget.style.backgroundColor = 'var(--color-background)';
                            }
                          }}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium sticky left-0" style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-surface-hover)' }}>
                            <div className="flex items-center space-x-2">
                              <span>{rowIndex + 1}</span>
                              {rowIndex === headerRow - 1 && (
                                <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>列名</span>
                              )}
                              {rowIndex >= dataStartRow - 1 && rowIndex !== headerRow - 1 && (
                                <span className="px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}>数据</span>
                              )}
                            </div>
                          </td>
                          {row.map((cell: any, cellIndex: number) => (
                            <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm" style={{ color: 'var(--color-text)' }}>
                              {cell !== null && cell !== undefined ? String(cell).slice(0, 50) : <span style={{ color: 'var(--color-text-tertiary)' }}>空</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center space-x-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded border-2" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-primary)' }}></div>
                    <span>列名行</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-success)' }}></div>
                    <span>数据行</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="card p-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-lg)' }}
                    >
                      <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>上传数据文件</h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>支持 CSV、Excel 格式，快速开始可视化</p>
                    </div>
                  </div>
                  <FileUpload onFileSelect={handleFileSelect} />
                </div>

                {isLoading && (
                  <div className="card p-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
                        <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>正在预览文件...</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>大文件可能需要较长时间</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="card p-6 border-2" style={{ borderColor: 'var(--color-error)', backgroundColor: 'rgba(var(--color-warning-rgb, 235, 203, 139), 0.2)' }}>
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(var(--color-error-rgb, 191, 97, 106), 0.2)' }}>
                        <svg className="w-5 h-5" style={{ color: 'var(--color-error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-error)' }}>解析错误</h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-warning)' }}>{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: '📤', title: '上传文件', desc: '支持 CSV、Excel 格式，最大 100MB' },
                    { icon: '📊', title: '处理数据', desc: '筛选、清洗、转换数据' },
                    { icon: '✨', title: '生成图表', desc: '自定义样式，导出结果' },
                  ].map((item, i) => (
                    <div key={i} className="card p-6 group cursor-pointer">
                      <div className="flex items-center space-x-4 mb-4">
                        <div 
                          className="p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                          style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-lg)' }}
                        >
                          <span className="text-2xl">{item.icon}</span>
                        </div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{item.title}</h3>
                      </div>
                      <p style={{ color: 'var(--color-text-secondary)' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="card overflow-hidden">
              <button
                onClick={() => setIsDataExpanded(!isDataExpanded)}
                className="w-full px-4 py-3 border-b flex items-center justify-between transition-colors"
                style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(var(--color-accent-rgb, 129, 161, 193), 0.2)' }}>
                    <Zap className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>数据状态与预览</h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      原始: <span className="font-bold">{parsedData.data.length.toLocaleString()}</span> 行 → 
                      筛选: <span className="font-bold" style={{ color: 'var(--color-success)' }}>{filteredData?.length.toLocaleString() || 0}</span> → 
                      清洗: <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{cleanedData?.length.toLocaleString() || (filteredData?.length.toLocaleString() || 0)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>列: {parsedData.headers.length}</span>
                    <span>数值列: {numericColumns.length}</span>
                  </div>
                  {isDataExpanded ? <ChevronUp className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronDown className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />}
                </div>
              </button>

              {isDataExpanded && (
                <div className="p-4 space-y-4">
                  <div className="card p-3">
                    <FileUpload onFileSelect={handleFileSelect} />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Table2 className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>数据预览</h3>
                  </div>
                  <DataPreview
                    data={{ ...parsedData, data: workingData.slice(0, 50) as any, totalCount: workingData.length }}
                    selectedColumns={selectedColumns}
                    onColumnSelect={handleColumnSelect}
                    maxPreviewRows={5}
                  />
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <button
                onClick={() => setIsDataProcessExpanded(!isDataProcessExpanded)}
                className="w-full px-6 py-4 border-b flex items-center justify-between transition-colors"
                style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>数据处理模块</h2>
                </div>
                {isDataProcessExpanded ? <ChevronUp className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} /> : <ChevronDown className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />}
              </button>

              {isDataProcessExpanded && (
                <>
                  <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex overflow-x-auto">
                      {dataTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveDataTab(tab.id)}
                          className="flex items-center space-x-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2"
                          style={{
                            color: activeDataTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            borderColor: activeDataTab === tab.id ? 'var(--color-primary)' : 'transparent',
                            backgroundColor: activeDataTab === tab.id ? 'var(--color-surface)' : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (activeDataTab !== tab.id) {
                              e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeDataTab !== tab.id) {
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
                    {activeDataTab === 'filter' && (
                      <DataFilter
                        data={parsedData.data}
                        columns={columnMetas}
                        onFilter={handleFilter}
                      />
                    )}

                    {activeDataTab === 'clean' && (
                      <DataCleaner
                        data={filteredData || parsedData.data}
                        columns={parsedData.headers}
                        onClean={handleClean}
                      />
                    )}

                    {activeDataTab === 'settings' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                          <span>文件解析设置</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>列名所在行</label>
                            <input
                              type="number"
                              min="1"
                              value={headerRow}
                              onChange={(e) => setHeaderRow(Math.max(1, parseInt(e.target.value) || 1))}
                              className="input"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>数据开始行</label>
                            <input
                              type="number"
                              min="1"
                              value={dataStartRow}
                              onChange={(e) => setDataStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                              className="input"
                            />
                          </div>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>修改后请重新上传文件</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center space-x-2">
                  <LineChart className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>图表模块</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>X轴（横轴）数据列</label>
                        <select
                          value={xAxisColumn}
                          onChange={(e) => setXAxisColumn(e.target.value)}
                          className="input select w-full"
                        >
                          <option value="">请选择列</option>
                          {parsedData?.headers.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Y轴（纵轴）数据列</label>
                        <MultiSelect
                          options={parsedData?.headers || []}
                          selected={yAxisColumns}
                          onChange={setYAxisColumns}
                          placeholder="请选择列"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>数据显示范围</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max={workingData.length - 1}
                            value={displayStartRow}
                            onChange={(e) => setDisplayStartRow(Math.max(0, parseInt(e.target.value) || 0))}
                            className="input w-20"
                            placeholder="起始"
                          />
                          <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                          <input
                            type="number"
                            min="1"
                            max={workingData.length}
                            value={displayEndRow}
                            onChange={(e) => setDisplayEndRow(Math.min(workingData.length, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="input w-20"
                            placeholder="结束"
                          />
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={() => { 
                              setDisplayStartRow(0); 
                              setDisplayEndRow(workingData.length); 
                              setMaxDisplayRows(workingData.length);
                            }}
                            className="text-xs"
                            style={{ color: 'var(--color-primary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-accent)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                          >
                            显示全部
                          </button>
                          <span style={{ color: 'var(--color-border)' }}>|</span>
                          <button
                            onClick={() => { 
                              setDisplayStartRow(0); 
                              setDisplayEndRow(200); 
                              setMaxDisplayRows(200);
                            }}
                            className="text-xs"
                            style={{ color: 'var(--color-text-secondary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                          >
                            重置
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
                        <Sparkles className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                        <span>图表预览</span>
                      </h3>
                      {yAxisColumns.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          <span>Y轴: {yAxisColumns.length} 列</span>
                          {xAxisColumn && <span style={{ color: 'var(--color-primary)' }}>| X轴: {xAxisColumn}</span>}
                        </div>
                      )}
                    </div>

                    {!xAxisColumn || yAxisColumns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-80" style={{ color: 'var(--color-text-secondary)' }}>
                        <BarChart2 className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg">请选择X轴和Y轴数据列</p>
                        <p className="text-sm mt-2 opacity-50">在上方设置中选择</p>
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-80" style={{ color: 'var(--color-text-secondary)' }}>
                        <p>暂无有效数据</p>
                      </div>
                    ) : (
                      <Chart
                        data={chartData}
                        xAxisKey="name"
                        yAxisKeys={yAxisColumns}
                        title={chartConfig.title}
                        chartType={chartConfig.chartType}
                        colors={chartColors}
                        seriesConfigs={chartConfig.seriesConfigs}
                        showGrid={chartConfig.showGrid}
                        showLegend={chartConfig.showLegend}
                        showDataPoints={chartConfig.showDataPoints}
                        lineWidth={chartConfig.lineWidth}
                        dataPointSize={chartConfig.dataPointSize}
                        opacity={chartConfig.opacity}
                        onChartTypeChange={handleChartTypeChange}
                        xAxisLabel={!chartConfig.xAxisLabel || chartConfig.xAxisLabel === 'X轴' ? (xAxisColumn || 'X轴') : chartConfig.xAxisLabel}
                        yAxisLabel={!chartConfig.yAxisLabel || chartConfig.yAxisLabel === 'Y轴' ? (yAxisColumns.length > 0 ? yAxisColumns.slice(0, 3).join(', ') + (yAxisColumns.length > 3 ? '...' : '') : 'Y轴') : chartConfig.yAxisLabel}
                        enableDualAxis={chartConfig.enableDualAxis}
                        dualAxisKeys={chartConfig.dualAxisKeys}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Settings2 className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>图表配置</h3>
                    </div>
                    <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
                      <ChartConfigPanel
                        config={chartConfig}
                        onConfigChange={setChartConfig}
                        dataKeys={yAxisColumns}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="backdrop-blur-xl border-t mt-12 relative z-10" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              数据可视化应用 - 支持 CSV 和 Excel 文件
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Built with Shawnzhang
            </p>
          </div>
        </div>
      </footer>
    </div>
    </ThemeProvider>
  );
}

export default App;
