import { useState, useCallback, useMemo } from 'react';
import { Download, RefreshCw, FileSpreadsheet, BarChart2, Sparkles, Zap } from 'lucide-react';
import FileUpload from './components/FileUpload';
import DataPreview from './components/DataPreview';
import Chart from './components/Chart';
import ChartConfigPanel, { ChartConfig, DEFAULT_CONFIG } from './components/ChartConfig';
import { parseFile, ParsedData, sampleDataByRange } from './utils/fileParser';

function App() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [xAxisColumn, setXAxisColumn] = useState<string>('');
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);
  const [timeColumn, setTimeColumn] = useState<string>('');
  const [chartConfig, setChartConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [dataStartRow, setDataStartRow] = useState<number>(2);
  const [displayStartRow, setDisplayStartRow] = useState<number>(0);
  const [displayEndRow, setDisplayEndRow] = useState<number>(200);
  const [maxDisplayRows, setMaxDisplayRows] = useState<number>(200);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await parseFile(file, {
        headerRow,
        dataStartRow,
        onProgress: (progress) => {
          console.log(`解析进度: ${progress}%`);
        },
      });
      
      setParsedData(data);
      setSelectedColumns(data.headers.slice(0, Math.min(3, data.headers.length)));
      setXAxisColumn(data.headers[0] || '');
      setYAxisColumns(data.headers.slice(1, Math.min(4, data.headers.length)));
      setChartConfig(DEFAULT_CONFIG);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
      setParsedData(null);
      setSelectedColumns([]);
    } finally {
      setIsLoading(false);
    }
  }, [headerRow, dataStartRow]);

  const handleColumnSelect = useCallback((columns: string[]) => {
    setSelectedColumns(columns);
  }, []);

  const chartData = useMemo(() => {
    if (!parsedData || !xAxisColumn || yAxisColumns.length === 0) {
      return [];
    }

    const sampledData = sampleDataByRange(
      parsedData.data,
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
  }, [parsedData, xAxisColumn, yAxisColumns, displayStartRow, displayEndRow, maxDisplayRows]);

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
    if (!parsedData) return;

    const csvContent = [
      parsedData.headers.join(','),
      ...parsedData.data.map((row) =>
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
  }, [parsedData]);

  const handleExportChart = useCallback(() => {
    const chartContainer = document.querySelector('[class*="recharts-wrapper"]');
    if (!chartContainer) {
      alert('未找到图表元素，请确保已生成图表');
      return;
    }

    const svgElement = chartContainer.querySelector('svg');
    if (!svgElement) {
      alert('未找到SVG元素');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 3;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = 'chart_high_res.png';
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const handleReset = useCallback(() => {
    setParsedData(null);
    setSelectedColumns([]);
    setXAxisColumn('');
    setYAxisColumns([]);
    setTimeColumn('');
    setChartConfig(DEFAULT_CONFIG);
    setError(null);
    setHeaderRow(1);
    setDataStartRow(2);
    setDisplayStartRow(0);
    setDisplayEndRow(200);
    setMaxDisplayRows(200);
  }, []);

  const handleChartTypeChange = useCallback((type: string) => {
    setChartConfig(prev => ({ ...prev, chartType: type as any }));
  }, []);

  const chartColors = useMemo(() => {
    return chartConfig.useCustomColors ? chartConfig.customColors : chartConfig.colorScheme.colors;
  }, [chartConfig]);

  return (
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/25">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  数据可视化
                </h1>
                <p className="text-xs text-gray-400">Data Visualization</p>
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
                <button
                  onClick={handleExportChart}
                  className="btn btn-primary"
                >
                  <Download className="w-4 h-4" />
                  <span>导出图表</span>
                </button>
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
            <div className="card p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">上传数据文件</h2>
                  <p className="text-gray-500">支持 CSV、Excel 格式，快速开始可视化</p>
                </div>
              </div>
              <FileUpload onFileSelect={handleFileSelect} />
            </div>

            {isLoading && (
              <div className="card p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-violet-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-gray-600 font-medium">正在解析文件...</p>
                  <p className="text-sm text-gray-400">大文件可能需要较长时间</p>
                </div>
              </div>
            )}

            {error && (
              <div className="card p-6 border-2 border-red-200 bg-red-50">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-700">解析错误</h3>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '📤', title: '上传文件', desc: '支持 CSV、Excel 格式，最大 100MB', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/25' },
                { icon: '📊', title: '预览数据', desc: '查看统计信息，选择数据列', gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/25' },
                { icon: '✨', title: '生成图表', desc: '自定义样式，导出结果', gradient: 'from-fuchsia-500 to-pink-500', shadow: 'shadow-fuchsia-500/25' },
              ].map((item, i) => (
                <div key={i} className="card p-6 group cursor-pointer">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${item.gradient} ${item.shadow} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <span className="text-2xl">{item.icon}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                  </div>
                  <p className="text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="card p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-200">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-violet-100">
                  <Zap className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-violet-700">数据范围提示</h3>
                  <p className="text-sm text-violet-600 mt-1">
                    总数据量: <span className="font-bold">{parsedData.data.length.toLocaleString()}</span> 行 | 
                    当前显示: 第 <span className="font-bold">{displayStartRow + 1}</span> 行 - 第 <span className="font-bold">{Math.min(displayEndRow, parsedData.data.length)}</span> 行
                    {displayEndRow - displayStartRow > maxDisplayRows && ` (已采样至 ${maxDisplayRows} 点)`}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <FileUpload onFileSelect={handleFileSelect} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
                    <span>文件解析设置</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">列名所在行</label>
                      <input
                        type="number"
                        min="1"
                        value={headerRow}
                        onChange={(e) => setHeaderRow(Math.max(1, parseInt(e.target.value) || 1))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">数据开始行</label>
                      <input
                        type="number"
                        min="1"
                        value={dataStartRow}
                        onChange={(e) => setDataStartRow(Math.max(1, parseInt(e.target.value) || 1))}
                        className="input"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">修改后请重新上传文件</p>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                    <span>数据显示范围</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">起始行</label>
                        <input
                          type="number"
                          min="0"
                          max={parsedData ? parsedData.data.length - 1 : 0}
                          value={displayStartRow}
                          onChange={(e) => setDisplayStartRow(Math.max(0, parseInt(e.target.value) || 0))}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">结束行</label>
                        <input
                          type="number"
                          min="1"
                          max={parsedData ? parsedData.data.length : 1}
                          value={displayEndRow}
                          onChange={(e) => setDisplayEndRow(Math.min(parsedData?.data.length || 1, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="input"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">最大显示点数</label>
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        value={maxDisplayRows}
                        onChange={(e) => setMaxDisplayRows(Math.min(5000, Math.max(50, parseInt(e.target.value) || 200)))}
                        className="input"
                      />
                      <p className="text-xs text-gray-400 mt-1">超过此值自动采样</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => { setDisplayStartRow(0); setDisplayEndRow(200); setMaxDisplayRows(200); }}
                        className="btn btn-ghost text-sm"
                      >
                        重置
                      </button>
                      <button
                        onClick={() => { if (parsedData) { setDisplayStartRow(0); setDisplayEndRow(parsedData.data.length); }}}
                        className="btn btn-secondary text-sm"
                      >
                        显示全部
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      {[
                        { label: '当前范围', value: `第 ${displayStartRow + 1} 行 - 第 ${Math.min(displayEndRow, parsedData?.data.length || 0)} 行` },
                        { label: '总数据量', value: `${parsedData?.data.length.toLocaleString() || 0} 行` },
                        { label: '实际显示', value: `${Math.min(displayEndRow - displayStartRow, maxDisplayRows)} 点${displayEndRow - displayStartRow > maxDisplayRows ? ' (已采样)' : ''}`, highlight: true },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-500">{item.label}:</span>
                          <span className={item.highlight ? 'text-violet-600 font-semibold' : 'text-gray-700 font-medium'}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500" />
                    <span>坐标轴设置</span>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">X轴（横轴）数据列</label>
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
                      <label className="block text-sm font-medium text-gray-600 mb-2">Y轴（纵轴）数据列（可多选）</label>
                      <div className="bg-white border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                        {parsedData?.headers.map((header) => (
                          <label key={header} className="flex items-center space-x-3 py-1.5 cursor-pointer hover:bg-gray-50 px-3 rounded-lg transition-colors">
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
                              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                            <span className="text-sm text-gray-700">{header}</span>
                          </label>
                        ))}
                      </div>
                      {yAxisColumns.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2">已选择 {yAxisColumns.length} 列</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">时间列（可选）</label>
                      <select
                        value={timeColumn}
                        onChange={(e) => setTimeColumn(e.target.value)}
                        className="input select"
                      >
                        <option value="">无</option>
                        {parsedData?.headers.map((header) => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <DataPreview
                  data={parsedData}
                  selectedColumns={selectedColumns}
                  onColumnSelect={handleColumnSelect}
                  maxPreviewRows={10}
                />

                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">数据摘要</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '总行数', value: parsedData.totalCount.toLocaleString(), gradient: 'from-violet-500 to-purple-500' },
                      { label: '总列数', value: parsedData.headers.length, gradient: 'from-cyan-500 to-blue-500' },
                      { label: '已选列', value: selectedColumns.length, gradient: 'from-fuchsia-500 to-pink-500' },
                      { label: '数值列', value: numericColumns.length, gradient: 'from-emerald-500 to-green-500' },
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <p className={`text-2xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-violet-500" />
                      <span>图表预览</span>
                    </h2>
                    {yAxisColumns.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>Y轴: {yAxisColumns.length} 列</span>
                        {xAxisColumn && <span className="text-violet-600">| X轴: {xAxisColumn}</span>}
                      </div>
                    )}
                  </div>

                  {!xAxisColumn || yAxisColumns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                      <BarChart2 className="w-16 h-16 mb-4 opacity-30" />
                      <p className="text-lg">请选择X轴和Y轴数据列</p>
                      <p className="text-sm mt-2 opacity-50">在左侧坐标轴设置中选择</p>
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-80 text-gray-400">
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
                      opacity={chartConfig.opacity}
                      onChartTypeChange={handleChartTypeChange}
                      xAxisLabel={chartConfig.xAxisLabel}
                      yAxisLabel={chartConfig.yAxisLabel}
                    />
                  )}
                </div>

                <ChartConfigPanel
                  config={chartConfig}
                  onConfigChange={setChartConfig}
                  dataKeys={yAxisColumns}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white/80 backdrop-blur-xl border-t border-gray-100 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              数据可视化应用 - 支持 CSV 和 Excel 文件
            </p>
            <p className="text-sm text-gray-400">
              Built with React & Recharts
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
