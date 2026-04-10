import { useState, useCallback, useMemo } from 'react';
import { Download, RefreshCw, FileSpreadsheet, BarChart2, Sparkles, Zap, FileImage, Image, FileText, Settings2, Filter, Eraser, Eye, Check, Database, LineChart, Table2, ChevronDown, ChevronUp } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DataPreview from './components/DataPreview';
import DataFilter from './components/DataFilter';
import DataCleaner from './components/DataCleaner';
import Chart from './components/Chart';
import ChartConfigPanel, { ChartConfig, DEFAULT_CONFIG } from './components/ChartConfig';
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
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-50 bg-[#ECEFF4]/90 backdrop-blur-xl border-b border-[#D8DEE9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#5E81AC] to-[#81A1C1] shadow-lg shadow-[#5E81AC]/20">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#2E3440]">
                  数据可视化
                </h1>
                <p className="text-xs text-[#4C566A]">Data Visualization</p>
              </div>
            </div>
            
            {parsedData && (
              <div className="flex items-center space-x-2">
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
                  <div className="absolute right-0 top-full mt-1 py-2 bg-white rounded-xl shadow-xl border border-[#D8DEE9] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[160px]">
                    <button
                      onClick={() => exportChartAsSvg({ fileName: 'chart.svg', title: chartConfig.title })}
                      className="w-full px-4 py-2 text-left text-sm text-[#3B4252] hover:bg-[#ECEFF4] hover:text-[#5E81AC] flex items-center space-x-2"
                    >
                      <FileImage className="w-4 h-4" />
                      <span>SVG 矢量图</span>
                    </button>
                    <button
                      onClick={() => exportChartAsPng({ fileName: 'chart.png', title: chartConfig.title, quality: 2 })}
                      className="w-full px-4 py-2 text-left text-sm text-[#3B4252] hover:bg-[#ECEFF4] hover:text-[#5E81AC] flex items-center space-x-2"
                    >
                      <Image className="w-4 h-4" />
                      <span>PNG 图片</span>
                    </button>
                    <button
                      onClick={() => exportChartAsPdf({ fileName: 'chart.pdf', title: chartConfig.title })}
                      className="w-full px-4 py-2 text-left text-sm text-[#3B4252] hover:bg-[#ECEFF4] hover:text-[#5E81AC] flex items-center space-x-2"
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
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {!parsedData ? (
          <div className="space-y-8 animate-fade-in">
            {showPreview && previewState ? (
              <div className="card p-6 animate-fade-in">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#5E81AC] to-[#81A1C1] shadow-lg shadow-[#5E81AC]/20">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-[#2E3440]">文件预览 - 选择列名行</h2>
                    <p className="text-[#4C566A]">预览前 {previewState.rows.length} 行，确认列名所在行后点击确认解析</p>
                  </div>
                  <button
                    onClick={() => { setShowPreview(false); setPreviewState(null); }}
                    className="btn btn-ghost"
                  >
                    取消
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gradient-to-r from-[#ECEFF4] to-[#E5E9F0] rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-[#3B4252] mb-2">列名所在行</label>
                    <input
                      type="number"
                      min="1"
                      max={previewState.rows.length}
                      value={headerRow}
                      onChange={(e) => setHeaderRow(Math.max(1, Math.min(previewState.rows.length, parseInt(e.target.value) || 1)))}
                      className="input"
                    />
                    <p className="text-xs text-[#4C566A] mt-1">当前选中第 {headerRow} 行作为列名</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3B4252] mb-2">数据开始行</label>
                    <input
                      type="number"
                      min="1"
                      value={dataStartRow}
                      onChange={(e) => setDataStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input"
                    />
                    <p className="text-xs text-[#4C566A] mt-1">从第 {dataStartRow} 行开始读取数据</p>
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

                <div className="overflow-x-auto border border-[#D8DEE9] rounded-xl">
                  <table className="min-w-full divide-y divide-[#D8DEE9]">
                    <thead>
                      <tr className="bg-[#E5E9F0]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[#4C566A] uppercase tracking-wider bg-[#E5E9F0] sticky left-0">
                          行号
                        </th>
                        {previewState.rows[0]?.map((_: any, colIndex: number) => (
                          <th key={colIndex} className="px-3 py-2 text-left text-xs font-medium text-[#4C566A] uppercase tracking-wider">
                            列 {colIndex + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#D8DEE9]">
                      {previewState.rows.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className={`${
                            rowIndex === headerRow - 1 
                              ? 'bg-[#D8DEE9] border-2 border-[#5E81AC]' 
                              : rowIndex >= dataStartRow - 1 
                                ? 'bg-[#ECEFF4]' 
                                : ''
                          } hover:bg-[#E5E9F0] transition-colors`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-[#2E3440] bg-[#E5E9F0] sticky left-0">
                            <div className="flex items-center space-x-2">
                              <span>{rowIndex + 1}</span>
                              {rowIndex === headerRow - 1 && (
                                <span className="px-2 py-0.5 text-xs bg-[#5E81AC] text-white rounded-full">列名</span>
                              )}
                              {rowIndex >= dataStartRow - 1 && rowIndex !== headerRow - 1 && (
                                <span className="px-2 py-0.5 text-xs bg-[#A3BE8C] text-white rounded-full">数据</span>
                              )}
                            </div>
                          </td>
                          {row.map((cell: any, cellIndex: number) => (
                            <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-[#3B4252]">
                              {cell !== null && cell !== undefined ? String(cell).slice(0, 50) : <span className="text-[#D8DEE9]">空</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center space-x-4 text-sm text-[#4C566A]">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-[#D8DEE9] border-2 border-[#5E81AC] rounded"></div>
                    <span>列名行</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-[#ECEFF4] border border-[#A3BE8C] rounded"></div>
                    <span>数据行</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="card p-8">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#5E81AC] to-[#81A1C1] shadow-lg shadow-[#5E81AC]/20">
                      <FileSpreadsheet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#2E3440]">上传数据文件</h2>
                      <p className="text-[#4C566A]">支持 CSV、Excel 格式，快速开始可视化</p>
                    </div>
                  </div>
                  <FileUpload onFileSelect={handleFileSelect} />
                </div>

                {isLoading && (
                  <div className="card p-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-[#D8DEE9] border-t-[#5E81AC] rounded-full animate-spin" />
                        <Sparkles className="w-6 h-6 text-[#5E81AC] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[#3B4252] font-medium">正在预览文件...</p>
                      <p className="text-sm text-[#4C566A]">大文件可能需要较长时间</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="card p-6 border-2 border-[#BF616A] bg-[#EBCB8B]/20">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-[#BF616A]/20">
                        <svg className="w-5 h-5 text-[#BF616A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#BF616A]">解析错误</h3>
                        <p className="text-sm text-[#D08770] mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: '📤', title: '上传文件', desc: '支持 CSV、Excel 格式，最大 100MB', gradient: 'from-[#5E81AC] to-[#81A1C1]', shadow: 'shadow-[#5E81AC]/20' },
                    { icon: '📊', title: '处理数据', desc: '筛选、清洗、转换数据', gradient: 'from-[#81A1C1] to-[#88C0D0]', shadow: 'shadow-[#81A1C1]/20' },
                    { icon: '✨', title: '生成图表', desc: '自定义样式，导出结果', gradient: 'from-[#88C0D0] to-[#8FBCBB]', shadow: 'shadow-[#88C0D0]/20' },
                  ].map((item, i) => (
                    <div key={i} className="card p-6 group cursor-pointer">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${item.gradient} ${item.shadow} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <span className="text-2xl">{item.icon}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[#2E3440]">{item.title}</h3>
                      </div>
                      <p className="text-[#4C566A]">{item.desc}</p>
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
                className="w-full px-4 py-3 bg-gradient-to-r from-[#ECEFF4] to-[#E5E9F0] border-b border-[#D8DEE9] flex items-center justify-between hover:from-[#E5E9F0] hover:to-[#D8DEE9] transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#81A1C1]/20">
                    <Zap className="w-4 h-4 text-[#5E81AC]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-[#2E3440]">数据状态与预览</h3>
                    <p className="text-xs text-[#4C566A]">
                      原始: <span className="font-bold">{parsedData.data.length.toLocaleString()}</span> 行 → 
                      筛选: <span className="font-bold text-[#A3BE8C]">{filteredData?.length.toLocaleString() || 0}</span> → 
                      清洗: <span className="font-bold text-[#81A1C1]">{cleanedData?.length.toLocaleString() || (filteredData?.length.toLocaleString() || 0)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3 text-xs text-[#4C566A]">
                    <span>列: {parsedData.headers.length}</span>
                    <span>数值列: {numericColumns.length}</span>
                  </div>
                  {isDataExpanded ? <ChevronUp className="w-5 h-5 text-[#4C566A]" /> : <ChevronDown className="w-5 h-5 text-[#4C566A]" />}
                </div>
              </button>
              
              {isDataExpanded && (
                <div className="p-4 space-y-4">
                  <div className="card p-3">
                    <FileUpload onFileSelect={handleFileSelect} />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Table2 className="w-4 h-4 text-[#4C566A]" />
                    <h3 className="text-sm font-semibold text-[#2E3440]">数据预览</h3>
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
                className="w-full px-6 py-4 bg-gradient-to-r from-[#E5E9F0] to-[#ECEFF4] border-b border-[#D8DEE9] flex items-center justify-between hover:from-[#D8DEE9] hover:to-[#E5E9F0] transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-[#5E81AC]" />
                  <h2 className="text-lg font-semibold text-[#2E3440]">数据处理模块</h2>
                </div>
                {isDataProcessExpanded ? <ChevronUp className="w-5 h-5 text-[#4C566A]" /> : <ChevronDown className="w-5 h-5 text-[#4C566A]" />}
              </button>
              
              {isDataProcessExpanded && (
                <>
                  <div className="border-b border-[#D8DEE9]">
                    <div className="flex overflow-x-auto">
                      {dataTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveDataTab(tab.id)}
                          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                            activeDataTab === tab.id
                              ? 'text-[#5E81AC] border-[#5E81AC] bg-[#ECEFF4]'
                              : 'text-[#4C566A] border-transparent hover:text-[#2E3440] hover:bg-[#E5E9F0]'
                          }`}
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
                        <h3 className="text-lg font-semibold text-[#2E3440] flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full bg-[#5E81AC]" />
                          <span>文件解析设置</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#3B4252] mb-2">列名所在行</label>
                            <input
                              type="number"
                              min="1"
                              value={headerRow}
                              onChange={(e) => setHeaderRow(Math.max(1, parseInt(e.target.value) || 1))}
                              className="input"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#3B4252] mb-2">数据开始行</label>
                            <input
                              type="number"
                              min="1"
                              value={dataStartRow}
                              onChange={(e) => setDataStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                              className="input"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#4C566A]">修改后请重新上传文件</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-[#ECEFF4] to-[#E5E9F0] border-b border-[#D8DEE9]">
                <div className="flex items-center space-x-2">
                  <LineChart className="w-5 h-5 text-[#5E81AC]" />
                  <h2 className="text-lg font-semibold text-[#2E3440]">图表模块</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-[#E5E9F0] to-[#ECEFF4] rounded-xl">
                      <div>
                        <label className="block text-sm font-medium text-[#3B4252] mb-2">X轴（横轴）数据列</label>
                        <select
                          value={xAxisColumn}
                          onChange={(e) => setXAxisColumn(e.target.value)}
                          className="input select"
                        >
                          <option value="">请选择列</option>
                          {parsedData?.headers.map((header) => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-[#3B4252] mb-2">Y轴（纵轴）数据列</label>
                        <div className="bg-white border border-[#D8DEE9] rounded-xl p-2 max-h-32 overflow-y-auto space-y-1">
                          {parsedData?.headers.map((header) => (
                            <label key={header} className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-[#ECEFF4] px-2 rounded-lg transition-colors">
                              <input
                                type="checkbox"
                                checked={yAxisColumns.includes(header)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setYAxisColumns([...yAxisColumns, header]);
                                  } else {
                                    setYAxisColumns(yAxisColumns.filter((col) => col !== header));
                                  }
                                }}
                                className="w-4 h-4 rounded border-[#D8DEE9] text-[#5E81AC] focus:ring-[#5E81AC]"
                              />
                              <span className="text-sm text-[#3B4252]">{header}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#3B4252] mb-2">数据显示范围</label>
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
                          <span className="text-[#4C566A]">-</span>
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
                            className="text-xs text-[#5E81AC] hover:text-[#81A1C1]"
                          >
                            显示全部
                          </button>
                          <span className="text-[#D8DEE9]">|</span>
                          <button
                            onClick={() => { 
                              setDisplayStartRow(0); 
                              setDisplayEndRow(200); 
                              setMaxDisplayRows(200);
                            }}
                            className="text-xs text-[#4C566A] hover:text-[#2E3440]"
                          >
                            重置
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[#2E3440] flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-[#5E81AC]" />
                        <span>图表预览</span>
                      </h3>
                      {yAxisColumns.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-[#4C566A]">
                          <span>Y轴: {yAxisColumns.length} 列</span>
                          {xAxisColumn && <span className="text-[#5E81AC]">| X轴: {xAxisColumn}</span>}
                        </div>
                      )}
                    </div>

                    {!xAxisColumn || yAxisColumns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-80 text-[#4C566A]">
                        <BarChart2 className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg">请选择X轴和Y轴数据列</p>
                        <p className="text-sm mt-2 opacity-50">在上方设置中选择</p>
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-80 text-[#4C566A]">
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
                        showDataPoints={chartConfig.showDataPoints}
                        lineWidth={chartConfig.lineWidth}
                        dataPointSize={chartConfig.dataPointSize}
                        opacity={chartConfig.opacity}
                        onChartTypeChange={handleChartTypeChange}
                        xAxisLabel={chartConfig.xAxisLabel}
                        yAxisLabel={chartConfig.yAxisLabel}
                        enableDualAxis={chartConfig.enableDualAxis}
                        dualAxisKeys={chartConfig.dualAxisKeys}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Settings2 className="w-4 h-4 text-[#5E81AC]" />
                      <h3 className="text-sm font-semibold text-[#2E3440]">图表配置</h3>
                    </div>
                    <div className="p-3 bg-[#E5E9F0] rounded-xl border border-[#D8DEE9]">
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

      <footer className="bg-[#ECEFF4]/90 backdrop-blur-xl border-t border-[#D8DEE9] mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#4C566A]">
              数据可视化应用 - 支持 CSV 和 Excel 文件
            </p>
            <p className="text-sm text-[#4C566A]">
              Built with Shawnzhang
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
