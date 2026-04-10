import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Brush, ComposedChart, Label,
} from 'recharts';
import { LineChart as LineIcon, BarChart2, ScatterChart as ScatterIcon, PieChart as PieIcon, Maximize2, X, Download, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SeriesConfig, SeriesType } from './ChartConfig';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'mixed';

const DEFAULT_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: 'bar', label: '柱状图', icon: <BarChart2 className="w-4 h-4" /> },
  { type: 'line', label: '折线图', icon: <LineIcon className="w-4 h-4" /> },
  { type: 'area', label: '面积图', icon: <LineIcon className="w-4 h-4" /> },
  { type: 'scatter', label: '散点图', icon: <ScatterIcon className="w-4 h-4" /> },
  { type: 'mixed', label: '混合图', icon: <BarChart2 className="w-4 h-4" /> },
  { type: 'pie', label: '饼图', icon: <PieIcon className="w-4 h-4" /> },
  { type: 'radar', label: '雷达图', icon: <PieIcon className="w-4 h-4" /> },
];

interface ChartProps {
  data: Record<string, string | number>[];
  xAxisKey?: string;
  yAxisKeys?: string[];
  title?: string;
  className?: string;
  chartType?: ChartType;
  colors?: string[];
  seriesConfigs?: SeriesConfig[];
  showGrid?: boolean;
  showDataPoints?: boolean;
  lineWidth?: number;
  dataPointSize?: number;
  opacity?: number;
  onChartTypeChange?: (type: ChartType) => void;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

const MAX_TOOLTIP_ITEMS = 10;
const MAX_RENDER_POINTS = 3000;

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey?: string }[];
  label?: string | number;
  colorMap?: Record<string, string>;
}

const CustomTooltip = memo<CustomTooltipProps>(({ active, payload, label, colorMap }) => {
  if (!active || !payload || payload.length === 0) return null;

  const displayLabel = label !== undefined ? String(label) : '';
  
  const uniquePayload = payload.reduce((acc: { dataKey?: string; name?: string; value: number; color: string }[], entry) => {
    const key = entry.dataKey || entry.name;
    if (!acc.find(item => (item.dataKey || item.name) === key)) {
      acc.push(entry);
    }
    return acc;
  }, []);
  
  const limitedPayload = uniquePayload.slice(0, MAX_TOOLTIP_ITEMS);

  return (
    <div style={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.98)', 
      backdropFilter: 'blur(12px)',
      padding: '12px 16px', 
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)', 
      borderRadius: '16px', 
      border: '1px solid rgba(0, 0, 0, 0.06)', 
      maxWidth: '280px' 
    }}>
      {displayLabel && (
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e1e32', marginBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>{displayLabel}</p>
      )}
      {limitedPayload.map((entry, index) => {
        const displayName = entry.dataKey || entry.name;
        if (!displayName || displayName === displayLabel) return null;
        const color = colorMap?.[displayName] || entry.color || '#8b5cf6';
        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ color: '#666' }}>{displayName}:</span>
            <span style={{ fontWeight: 600, color: '#1e1e32' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        );
      })}
      {uniquePayload.length > MAX_TOOLTIP_ITEMS && (
        <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>...还有 {uniquePayload.length - MAX_TOOLTIP_ITEMS} 项未显示</p>
      )}
    </div>
  );
});

const ChartLegend = memo<{
  dataKeys: string[];
  hiddenSeries: number[];
  getSeriesConfig: (key: string, index: number) => { color: string; type: SeriesType; visible: boolean };
  toggleSeries: (index: number) => void;
}>(({ dataKeys, hiddenSeries, getSeriesConfig, toggleSeries }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '16px', padding: '0 16px' }}>
    {dataKeys.map((key, index) => {
      const isHidden = hiddenSeries.includes(index);
      const config = getSeriesConfig(key, index);
      return (
        <div
          key={index}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer', 
            opacity: isHidden ? 0.4 : 1, 
            padding: '8px 16px', 
            borderRadius: '24px', 
            transition: 'all 0.3s',
            backgroundColor: isHidden ? 'rgba(0,0,0,0.03)' : 'rgba(139, 92, 246, 0.08)',
            border: isHidden ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(139, 92, 246, 0.2)'
          }}
          onClick={() => toggleSeries(index)}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }} />
          <span style={{ fontSize: '13px', color: isHidden ? '#999' : '#333', textDecoration: isHidden ? 'line-through' : 'none' }}>
            {key}
          </span>
        </div>
      );
    })}
  </div>
));

const Chart: React.FC<ChartProps> = ({
  data, xAxisKey, yAxisKeys, title, className = '', chartType: externalChartType = 'line',
  colors = DEFAULT_COLORS, seriesConfigs = [], showGrid = true, showDataPoints = true,
  lineWidth = 2, dataPointSize = 4, opacity = 0.8, onChartTypeChange, xAxisLabel = '', yAxisLabel = '',
}) => {
  const [internalChartType, setInternalChartType] = useState<ChartType>(externalChartType);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<number[]>([]);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  useEffect(() => { setInternalChartType(externalChartType); }, [externalChartType]);

  const chartType = onChartTypeChange ? externalChartType : internalChartType;
  
  const setChartType = useCallback((type: ChartType) => {
    if (onChartTypeChange) onChartTypeChange(type);
    else setInternalChartType(type);
  }, [onChartTypeChange]);

  const sampledData = useMemo(() => {
    if (data.length <= MAX_RENDER_POINTS) return data;
    const step = data.length / MAX_RENDER_POINTS;
    const sampled: Record<string, string | number>[] = [];
    for (let i = 0; i < MAX_RENDER_POINTS; i++) {
      sampled.push(data[Math.floor(i * step)]);
    }
    return sampled;
  }, [data]);

  const dataKeys = useMemo(() => {
    if (yAxisKeys && yAxisKeys.length > 0) return yAxisKeys;
    if (data.length === 0) return [];
    const firstItem = data[0];
    const xKey = xAxisKey || Object.keys(firstItem)[0];
    return Object.keys(firstItem).filter(key => key !== xKey);
  }, [data, xAxisKey, yAxisKeys]);

  const xKey = useMemo(() => {
    if (xAxisKey) return xAxisKey;
    if (data.length === 0) return 'name';
    return Object.keys(data[0])[0];
  }, [data, xAxisKey]);

  const pieData = useMemo(() => {
    if (chartType !== 'pie' || data.length === 0 || dataKeys.length === 0) return [];
    const valueKey = dataKeys[0];
    return data.map((item, index) => ({
      name: String(item[xKey]),
      value: Number(item[valueKey]) || 0,
      color: colors[index % colors.length],
    }));
  }, [chartType, data, dataKeys, xKey, colors]);

  const yAxisDomain = useMemo((): [number, number] => {
    if (data.length === 0 || dataKeys.length === 0) return [0, 100];
    let min = Infinity, max = -Infinity;
    for (const item of sampledData) {
      for (const key of dataKeys) {
        const value = Number(item[key]);
        if (!isNaN(value)) { min = Math.min(min, value); max = Math.max(max, value); }
      }
    }
    if (min === Infinity || max === -Infinity) return [0, 100];
    const padding = (max - min) * 0.05 || 1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [sampledData, dataKeys]);

  const getSeriesConfig = useCallback((key: string, index: number): { color: string; type: SeriesType; visible: boolean } => {
    const config = seriesConfigs.find(s => s.key === key);
    return { color: config?.color || colors[index % colors.length], type: config?.type || 'line', visible: config?.visible !== false };
  }, [seriesConfigs, colors]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    dataKeys.forEach((key, index) => {
      map[key] = getSeriesConfig(key, index).color;
    });
    return map;
  }, [dataKeys, getSeriesConfig]);

  const toggleSeries = useCallback((index: number) => {
    setHiddenSeries(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  }, []);

  const convertOklchToHex = useCallback((element: HTMLElement): void => {
    const allElements = element.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlEl);
      
      const convertColor = (color: string): string => {
        if (color.includes('oklch')) {
          return '#8b5cf6';
        }
        return color;
      };
      
      if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('oklch')) {
        htmlEl.style.backgroundColor = convertColor(computedStyle.backgroundColor);
      }
      if (computedStyle.color && computedStyle.color.includes('oklch')) {
        htmlEl.style.color = convertColor(computedStyle.color);
      }
      if (computedStyle.borderColor && computedStyle.borderColor.includes('oklch')) {
        htmlEl.style.borderColor = convertColor(computedStyle.borderColor);
      }
    });
  }, []);

  const handleExportChart = useCallback(async (format: 'svg' | 'png' | 'pdf' = 'png') => {
    if (!modalContentRef.current) { setExportStatus('错误：无法找到图表元素'); return; }
    setIsExporting(true);
    setExportStatus(`正在导出 ${format.toUpperCase()}...`);
    try {
      const chartContainer = modalContentRef.current.querySelector('[class*="recharts-wrapper"]');
      if (!chartContainer) throw new Error('未找到图表元素');
      
      const svgElement = chartContainer.querySelector('svg');
      if (!svgElement) throw new Error('未找到SVG元素');
      
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width;
      const height = bbox.height;
      const scale = 3;
      
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      
      convertOklchToHex(clonedSvg as unknown as HTMLElement);
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      
      if (format === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'chart'}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportStatus('导出成功！');
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('无法创建Canvas上下文');
        
        const img = new Image();
        img.onload = () => {
          ctx.scale(scale, scale);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);
          
          if (format === 'png') {
            canvas.toBlob((blob) => {
              if (!blob) { setExportStatus('错误：生成图片失败'); setIsExporting(false); return; }
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${title || 'chart'}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              setExportStatus('导出成功！');
              setTimeout(() => { setIsExporting(false); setExportStatus(''); }, 1500);
            }, 'image/png', 1.0);
          } else if (format === 'pdf') {
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /XObject << /Img0 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
q ${width} 0 0 ${height} 0 0 cm /Img0 Do Q
endstream
endobj
5 0 obj
<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgData.length} >>
stream
${imgData}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000359 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${500 + imgData.length}
%%EOF`;
            const blob = new Blob([pdfContent], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${title || 'chart'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setExportStatus('导出成功！');
            setTimeout(() => { setIsExporting(false); setExportStatus(''); }, 1500);
          }
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    } catch (error) {
      console.error('导出图表失败:', error);
      setExportStatus(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setTimeout(() => { setIsExporting(false); setExportStatus(''); }, 3000);
    }
  }, [title, convertOklchToHex]);

  const renderMainChart = useCallback((height: number = 400) => {
    const commonProps = { data: sampledData, margin: { top: 40, right: 40, left: 60, bottom: 60 } };
    const xAxisComponent = (
      <XAxis dataKey={xKey} tick={{ fill: '#666', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }}>
        {xAxisLabel && <Label value={xAxisLabel} offset={-25} position="insideBottom" fill="#333" fontSize={13} fontWeight={600} />}
      </XAxis>
    );
    const yAxisComponent = (
      <YAxis domain={['auto', 'auto']} tick={{ fill: '#666', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} width={50}>
        {yAxisLabel && <Label value={yAxisLabel} angle={-90} offset={-25} position="insideLeft" fill="#333" fontSize={13} fontWeight={600} style={{ textAnchor: 'middle' }} />}
      </YAxis>
    );
    const brushComponent = <Brush dataKey={xKey} height={30} stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.08)" />;
    const dotSize = Math.max(2, Math.min(12, dataPointSize));

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
              {xAxisComponent}{yAxisComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                return <Line key={key} type="monotone" dataKey={key} name={key} stroke={config.color} strokeWidth={lineWidth} dot={showDataPoints ? { fill: config.color, strokeWidth: 2, r: dotSize } : false} activeDot={{ r: dotSize + 2, strokeWidth: 0, fill: config.color }} />;
              })}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
              {xAxisComponent}{yAxisComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                return <Bar key={key} dataKey={key} name={key} fill={config.color} opacity={opacity} radius={[6, 6, 0, 0]} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
              {xAxisComponent}{yAxisComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                return <Area key={key} type="monotone" dataKey={key} name={key} fill={config.color} stroke={config.color} fillOpacity={opacity * 0.5} />;
              })}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
              {xAxisComponent}
              {yAxisComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                return (
                  <Line 
                    key={key} 
                    type="monotone" 
                    dataKey={key} 
                    name={key}
                    stroke="transparent"
                    strokeWidth={0}
                    dot={{ fill: config.color, r: dotSize }}
                    activeDot={{ fill: config.color, r: dotSize + 3, strokeWidth: 2, stroke: '#fff' }}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'mixed':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
              {xAxisComponent}{yAxisComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                switch (config.type) {
                  case 'bar': return <Bar key={key} dataKey={key} name={key} fill={config.color} opacity={opacity} radius={[6, 6, 0, 0]} />;
                  case 'scatter': return (
                    <Line 
                      key={key} 
                      type="monotone" 
                      dataKey={key} 
                      name={key}
                      stroke="transparent"
                      strokeWidth={0}
                      dot={{ fill: config.color, r: dotSize }}
                      activeDot={{ fill: config.color, r: dotSize + 3, strokeWidth: 2, stroke: '#fff' }}
                    />
                  );
                  case 'area': return <Area key={key} type="monotone" dataKey={key} name={key} fill={config.color} stroke={config.color} fillOpacity={opacity * 0.5} />;
                  default: return <Line key={key} type="monotone" dataKey={key} name={key} stroke={config.color} strokeWidth={lineWidth} dot={showDataPoints ? { fill: config.color, strokeWidth: 2, r: dotSize } : false} activeDot={{ r: dotSize + 2, strokeWidth: 0, fill: config.color }} />;
                }
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}>
                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="#fff" strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={sampledData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey={xKey} tick={{ fill: '#666', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#666', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                return <Radar key={key} name={key} dataKey={key} stroke={config.color} fill={config.color} fillOpacity={opacity * 0.5} />;
              })}
            </RadarChart>
          </ResponsiveContainer>
        );
      default: return null;
    }
  }, [sampledData, xKey, yAxisDomain, dataKeys, hiddenSeries, getSeriesConfig, showGrid, showDataPoints, lineWidth, dataPointSize, opacity, chartType, xAxisLabel, yAxisLabel, pieData]);

  if (data.length === 0) {
    return (
      <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', padding: '24px' }} className={className}>
        {title && <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>{title}</h3>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px', color: '#999' }}><p>暂无数据</p></div>
      </div>
    );
  }

  return (
    <>
      <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)', padding: '24px' }} className={className}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {title && <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333' }}>{title}</h3>}
            <button onClick={() => setIsModalOpen(true)} style={{ padding: '8px', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.08)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} title="放大图表">
              <Maximize2 style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CHART_TYPES.map(({ type, label, icon }) => (
              <button key={type} onClick={() => setChartType(type)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.3s', background: chartType === type ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'rgba(0,0,0,0.04)', color: chartType === type ? '#fff' : '#666' }}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: '100%' }}>{renderMainChart()}</div>
        {chartType !== 'pie' && <ChartLegend dataKeys={dataKeys} hiddenSeries={hiddenSeries} getSeriesConfig={getSeriesConfig} toggleSeries={toggleSeries} />}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: '#999' }}>
            <span>数据点: {data.length.toLocaleString()}{data.length > MAX_RENDER_POINTS && ` (显示 ${MAX_RENDER_POINTS.toLocaleString()} 个)`}</span>
            <span>指标: {dataKeys.join(', ')}</span>
          </div>
        </div>
      </div>
      {isModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', padding: '16px' }}>
          <div ref={modalContentRef} data-chart-container style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)', width: '100%', maxWidth: '1280px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(168, 85, 247, 0.08))', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {title && <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#333' }}>{title}</h3>}
                <span style={{ padding: '4px 12px', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', color: '#fff', borderRadius: '20px', fontSize: '13px', fontWeight: 500 }}>放大视图</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <div className="relative group">
                  <button disabled={isExporting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: isExporting ? 'not-allowed' : 'pointer', transition: 'all 0.3s', background: isExporting ? '#ccc' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }} title="下载图表">
                    {isExporting ? (<><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /><span>{exportStatus || '导出中...'}</span></>) : (<><Download style={{ width: '16px', height: '16px' }} /><span>下载图表</span></>)}
                  </button>
                  <div className="absolute right-0 top-full mt-1 py-2 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[160px]">
                    <button
                      onClick={() => { handleExportChart('svg'); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center space-x-2"
                    >
                      <span>SVG 矢量图</span>
                    </button>
                    <button
                      onClick={() => { handleExportChart('png'); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center space-x-2"
                    >
                      <span>PNG 图片</span>
                    </button>
                    <button
                      onClick={() => { handleExportChart('pdf'); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center space-x-2"
                    >
                      <span>PDF 文档</span>
                    </button>
                  </div>
                </div>
                <button onClick={() => { setIsModalOpen(false); setIsExporting(false); setExportStatus(''); }} style={{ padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'rgba(0,0,0,0.04)' }} title="关闭"><X style={{ width: '20px', height: '20px', color: '#666' }} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                {CHART_TYPES.map(({ type, label, icon }) => (
                  <button key={type} onClick={() => setChartType(type)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.3s', background: chartType === type ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'rgba(0,0,0,0.04)', color: chartType === type ? '#fff' : '#666' }}>
                    {icon}<span>{label}</span>
                  </button>
                ))}
              </div>
              <div style={{ width: '100%' }}>{renderMainChart(500)}</div>
              {chartType !== 'pie' && <ChartLegend dataKeys={dataKeys} hiddenSeries={hiddenSeries} getSeriesConfig={getSeriesConfig} toggleSeries={toggleSeries} />}
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '14px', color: '#999' }}>
                  <span>数据点: {data.length.toLocaleString()}</span>
                  <span>指标: {dataKeys.join(', ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Chart;
