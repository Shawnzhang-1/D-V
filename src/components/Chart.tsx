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
import { useTheme } from '../contexts/ThemeContext';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'mixed';

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
  enableDualAxis?: boolean;
  dualAxisKeys?: string[];
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
      backgroundColor: 'var(--color-surface)', 
      backdropFilter: 'blur(12px)',
      padding: '12px 16px', 
      boxShadow: 'var(--shadow-lg)', 
      borderRadius: 'var(--radius-lg)', 
      border: '1px solid var(--color-border)', 
      maxWidth: '280px' 
    }}>
      {displayLabel && (
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>{displayLabel}</p>
      )}
      {limitedPayload.map((entry, index) => {
        const displayName = entry.dataKey || entry.name;
        if (!displayName || displayName === displayLabel) return null;
        const color = colorMap?.[displayName] || entry.color || 'var(--color-primary)';
        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>{displayName}:</span>
            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        );
      })}
      {uniquePayload.length > MAX_TOOLTIP_ITEMS && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>...还有 {uniquePayload.length - MAX_TOOLTIP_ITEMS} 项未显示</p>
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
            borderRadius: 'var(--radius-full)', 
            transition: 'all 0.3s',
            backgroundColor: isHidden ? 'var(--color-surface-hover)' : 'var(--color-surface)',
            border: isHidden ? '1px solid var(--color-border)' : `1px solid ${config.color}40`
          }}
          onClick={() => toggleSeries(index)}
        >
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }} />
          <span style={{ fontSize: 'var(--font-size-sm)', color: isHidden ? 'var(--color-text-secondary)' : 'var(--color-text)', textDecoration: isHidden ? 'line-through' : 'none' }}>
            {key}
          </span>
        </div>
      );
    })}
  </div>
));

const Chart: React.FC<ChartProps> = ({
  data, xAxisKey, yAxisKeys, title, className = '', chartType: externalChartType = 'line',
  colors, seriesConfigs = [], showGrid = true, showDataPoints = true,
  lineWidth = 2, dataPointSize = 4, opacity = 0.8, onChartTypeChange, xAxisLabel = '', yAxisLabel = '',
  enableDualAxis = false, dualAxisKeys = [],
}) => {
  const { theme } = useTheme();
  const chartColors = colors || theme.colors.chartColors;
  const [internalChartType, setInternalChartType] = useState<ChartType>(externalChartType);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<number[]>([]);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => { setInternalChartType(externalChartType); }, [externalChartType]);
  
  useEffect(() => {
    setChartKey(prev => prev + 1);
    setHiddenSeries([]);
  }, [enableDualAxis, dualAxisKeys]);

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
      color: chartColors[index % chartColors.length],
    }));
  }, [chartType, data, dataKeys, xKey, chartColors]);

  const getSeriesConfig = useCallback((key: string, index: number): { color: string; type: SeriesType; visible: boolean } => {
    const config = seriesConfigs.find(s => s.key === key);
    const colorIndex = index % chartColors.length;
    return { 
      color: config?.color || chartColors[colorIndex], 
      type: config?.type || 'line', 
      visible: config?.visible !== false 
    };
  }, [seriesConfigs, chartColors]);

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
          return theme.colors.primary;
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
  }, [theme]);

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
          ctx.fillStyle = theme.colors.surface;
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
    const xLabelLines = xAxisLabel ? Math.ceil(xAxisLabel.length / 12) : 0;
    const yLabelLines = yAxisLabel ? Math.ceil(yAxisLabel.length / 6) : 0;
    const rightLabelLines = enableDualAxis && (dualAxisKeys.length > 0 || dataKeys.length > 1) 
      ? Math.ceil((dualAxisKeys.length > 0 ? dualAxisKeys.join(', ') : dataKeys.slice(Math.ceil(dataKeys.length / 2)).join(', ')).length / 6) 
      : 0;
    
    const bottomMargin = 1 + xLabelLines * 1.1;
    const leftMargin = 1 + yLabelLines * 1.1;
    const rightMargin = enableDualAxis ? 1 + rightLabelLines * 1.1 : 10;
    
    const commonProps = { data: sampledData, margin: { top: 23, right: rightMargin, left: leftMargin, bottom: bottomMargin } };
    
    const xAxisComponent = (
      <XAxis 
        dataKey={xKey} 
        tick={{ fill: theme.colors.textSecondary, fontSize: 10 }} 
        axisLine={{ stroke: theme.colors.border }} 
        tickLine={{ stroke: theme.colors.border }}
        interval="preserveStartEnd"
        height={50}
      >
        {xAxisLabel && (
          <Label 
            value={xAxisLabel}
            offset={10}
            position="insideBottom"
            fill={theme.colors.text}
            fontSize={12}
            fontWeight={600}
          />
        )}
      </XAxis>
    );
    const yAxisComponent = (
      <YAxis 
        yAxisId="left" 
        domain={['auto', 'auto']} 
        tick={{ fill: theme.colors.textSecondary, fontSize: 10.5 }} 
        axisLine={{ stroke: theme.colors.border }} 
        tickLine={{ stroke: theme.colors.border }} 
        width={55}
      >
        {yAxisLabel && (
          <Label 
            value={yAxisLabel}
            angle={-90}
            offset={1}
            position="insideLeft"
            fill={theme.colors.text}
            fontSize={11}
            fontWeight={600}
            style={{ textAnchor: 'middle' }}
          />
        )}
      </YAxis>
    );
    
    const rightAxisLabel = dualAxisKeys.length > 0
      ? dualAxisKeys.slice(0, 2).join(', ') + (dualAxisKeys.length > 2 ? '...' : '')
      : (dataKeys.length > 1 ? dataKeys.slice(Math.ceil(dataKeys.length / 2)).slice(0, 2).join(', ') + (dataKeys.slice(Math.ceil(dataKeys.length / 2)).length > 2 ? '...' : '') : '');
    
    const yAxisRightComponent = enableDualAxis && (dualAxisKeys.length > 0 || dataKeys.length > 1) ? (
      <YAxis 
        yAxisId="right" 
        orientation="right" 
        domain={['auto', 'auto']} 
        tick={{ fill: theme.colors.textSecondary, fontSize: 11 }} 
        axisLine={{ stroke: theme.colors.border }} 
        tickLine={{ stroke: theme.colors.border }} 
        width={45}
      >
        {rightAxisLabel && (
          <Label 
            value={rightAxisLabel}
            angle={90}
            offset={10}
            position="insideRight"
            fill={theme.colors.text}
            fontSize={11}
            fontWeight={600}
            style={{ textAnchor: 'middle' }}
          />
        )}
      </YAxis>
    ) : null;
    
    const brushComponent = <Brush dataKey={xKey} height={30} stroke={theme.colors.primary} fill={`${theme.colors.primary}14`} />;
    const dotSize = Math.max(2, Math.min(12, dataPointSize));

    const isDualAxisKey = (key: string, index: number): boolean => {
      if (!enableDualAxis) return false;
      if (dualAxisKeys.length > 0) {
        return dualAxisKeys.includes(key);
      }
      return index >= Math.ceil(dataKeys.length / 2);
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.borderLight} />}
              {xAxisComponent}
              {yAxisComponent}
              {yAxisRightComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                const yAxisId = isDualAxisKey(key, index) ? 'right' : 'left';
                return <Line key={key} yAxisId={yAxisId} type="monotone" dataKey={key} name={key} stroke={config.color} strokeWidth={lineWidth} dot={showDataPoints ? { fill: config.color, strokeWidth: 2, r: dotSize } : false} activeDot={{ r: dotSize + 2, strokeWidth: 0, fill: config.color }} />;
              })}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.borderLight} />}
              {xAxisComponent}
              {yAxisComponent}
              {yAxisRightComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                const yAxisId = isDualAxisKey(key, index) ? 'right' : 'left';
                return <Bar key={key} yAxisId={yAxisId} dataKey={key} name={key} fill={config.color} opacity={opacity} radius={[6, 6, 0, 0]} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.borderLight} />}
              {xAxisComponent}
              {yAxisComponent}
              {yAxisRightComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                const yAxisId = isDualAxisKey(key, index) ? 'right' : 'left';
                return <Area key={key} yAxisId={yAxisId} type="monotone" dataKey={key} name={key} fill={config.color} stroke={config.color} fillOpacity={opacity * 0.5} />;
              })}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.borderLight} />}
              {xAxisComponent}
              {yAxisComponent}
              {yAxisRightComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                const yAxisId = isDualAxisKey(key, index) ? 'right' : 'left';
                return (
                  <Line 
                    key={key} 
                    yAxisId={yAxisId}
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
              {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.borderLight} />}
              {xAxisComponent}
              {yAxisComponent}
              {yAxisRightComponent}
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
              {brushComponent}
              {dataKeys.map((key, index) => {
                if (hiddenSeries.includes(index)) return null;
                const config = getSeriesConfig(key, index);
                if (!config.visible) return null;
                const yAxisId = isDualAxisKey(key, index) ? 'right' : 'left';
                switch (config.type) {
                  case 'bar': return <Bar key={key} yAxisId={yAxisId} dataKey={key} name={key} fill={config.color} opacity={opacity} radius={[6, 6, 0, 0]} />;
                  case 'scatter': return (
                    <Line 
                      key={key} 
                      yAxisId={yAxisId}
                      type="monotone" 
                      dataKey={key} 
                      name={key}
                      stroke="transparent"
                      strokeWidth={0}
                      dot={{ fill: config.color, r: dotSize }}
                      activeDot={{ fill: config.color, r: dotSize + 3, strokeWidth: 2, stroke: '#fff' }}
                    />
                  );
                  case 'area': return <Area key={key} yAxisId={yAxisId} type="monotone" dataKey={key} name={key} fill={config.color} stroke={config.color} fillOpacity={opacity * 0.5} />;
                  default: return <Line key={key} yAxisId={yAxisId} type="monotone" dataKey={key} name={key} stroke={config.color} strokeWidth={lineWidth} dot={showDataPoints ? { fill: config.color, strokeWidth: 2, r: dotSize } : false} activeDot={{ r: dotSize + 2, strokeWidth: 0, fill: config.color }} />;
                }
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={2} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: theme.colors.border, strokeWidth: 1 }}>
                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} stroke={theme.colors.surface} strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<CustomTooltip colorMap={colorMap} />} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={sampledData}>
              <PolarGrid stroke={theme.colors.border} />
              <PolarAngleAxis dataKey={xKey} tick={{ fill: theme.colors.textSecondary, fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: theme.colors.textSecondary, fontSize: 11 }} />
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
  }, [sampledData, xKey, dataKeys, hiddenSeries, getSeriesConfig, showGrid, showDataPoints, lineWidth, dataPointSize, opacity, chartType, xAxisLabel, yAxisLabel, pieData, colorMap, enableDualAxis, dualAxisKeys]);

  if (data.length === 0) {
    return (
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '24px' }} className={className}>
        {title && <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text)', marginBottom: '16px' }}>{title}</h3>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '320px', color: 'var(--color-text-secondary)' }}><p>暂无数据</p></div>
      </div>
    );
  }

  return (
    <>
      <div style={{ backgroundColor: 'var(--color-surface)', backdropFilter: 'blur(16px)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '24px' }} className={className}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {title && <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-text)' }}>{title}</h3>}
            <button onClick={() => setIsModalOpen(true)} style={{ padding: '8px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-hover)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} title="放大图表">
              <Maximize2 style={{ width: '16px', height: '16px', color: 'var(--color-primary)' }} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CHART_TYPES.map(({ type, label, icon }) => (
              <button key={type} onClick={() => setChartType(type)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.3s', background: chartType === type ? 'var(--gradient-primary)' : 'var(--color-surface-hover)', color: chartType === type ? '#fff' : 'var(--color-text-secondary)' }}>
                {icon}<span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div key={chartKey} style={{ width: '100%' }}>{renderMainChart()}</div>
        {chartType !== 'pie' && <ChartLegend dataKeys={dataKeys} hiddenSeries={hiddenSeries} getSeriesConfig={getSeriesConfig} toggleSeries={toggleSeries} />}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <span>数据点: {data.length.toLocaleString()}{data.length > MAX_RENDER_POINTS && ` (显示 ${MAX_RENDER_POINTS.toLocaleString()} 个)`}</span>
            <span>指标: {dataKeys.join(', ')}</span>
          </div>
        </div>
      </div>
      {isModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', padding: '16px' }}>
          <div ref={modalContentRef} data-chart-container style={{ backgroundColor: 'var(--color-surface)', backdropFilter: 'blur(20px)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: '1280px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--color-border)', background: 'var(--gradient-secondary)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {title && <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 600, color: 'var(--color-text)' }}>{title}</h3>}
                <span style={{ padding: '4px 12px', background: 'var(--gradient-primary)', color: '#fff', borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>放大视图</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <div className="relative group">
                  <button disabled={isExporting} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-base)', fontWeight: 500, border: 'none', cursor: isExporting ? 'not-allowed' : 'pointer', transition: 'all 0.3s', background: isExporting ? 'var(--color-border)' : 'linear-gradient(135deg, var(--color-success), var(--color-primary))', color: '#fff' }} title="下载图表">
                    {isExporting ? (<><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /><span>{exportStatus || '导出中...'}</span></>) : (<><Download style={{ width: '16px', height: '16px' }} /><span>下载图表</span></>)}
                  </button>
                  <div className="absolute right-0 top-full mt-1 py-2 rounded-xl shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-[160px]" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <button
                      onClick={() => { handleExportChart('svg'); }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center space-x-2"
                      style={{ color: 'var(--color-text)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; }}
                    >
                      <span>SVG 矢量图</span>
                    </button>
                    <button
                      onClick={() => { handleExportChart('png'); }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center space-x-2"
                      style={{ color: 'var(--color-text)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; }}
                    >
                      <span>PNG 图片</span>
                    </button>
                    <button
                      onClick={() => { handleExportChart('pdf'); }}
                      className="w-full px-4 py-2 text-left text-sm flex items-center space-x-2"
                      style={{ color: 'var(--color-text)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text)'; }}
                    >
                      <span>PDF 文档</span>
                    </button>
                  </div>
                </div>
                <button onClick={() => { setIsModalOpen(false); setIsExporting(false); setExportStatus(''); }} style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: 'var(--color-surface-hover)' }} title="关闭"><X style={{ width: '20px', height: '20px', color: 'var(--color-text-secondary)' }} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                {CHART_TYPES.map(({ type, label, icon }) => (
                  <button key={type} onClick={() => setChartType(type)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-base)', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'all 0.3s', background: chartType === type ? 'var(--gradient-primary)' : 'var(--color-surface-hover)', color: chartType === type ? '#fff' : 'var(--color-text-secondary)' }}>
                    {icon}<span>{label}</span>
                  </button>
                ))}
              </div>
              <div key={chartKey} style={{ width: '100%' }}>{renderMainChart(500)}</div>
              {chartType !== 'pie' && <ChartLegend dataKeys={dataKeys} hiddenSeries={hiddenSeries} getSeriesConfig={getSeriesConfig} toggleSeries={toggleSeries} />}
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)' }}>
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
