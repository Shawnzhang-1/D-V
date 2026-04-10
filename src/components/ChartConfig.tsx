import React from 'react';
import { RotateCcw } from 'lucide-react';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'mixed';

export type SeriesType = 'line' | 'bar' | 'scatter' | 'area';

export interface ColorScheme {
  id: string;
  name: string;
  colors: string[];
}

export interface SeriesConfig {
  key: string;
  color: string;
  type: SeriesType;
  visible: boolean;
}

export interface ChartConfig {
  chartType: ChartType;
  colorScheme: ColorScheme;
  customColors: string[];
  useCustomColors: boolean;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  showLegend: boolean;
  showGrid: boolean;
  showDataPoints: boolean;
  lineWidth: number;
  dataPointSize: number;
  opacity: number;
  seriesConfigs: SeriesConfig[];
}

interface ChartConfigPanelProps {
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  dataKeys?: string[];
  className?: string;
}

const PRESET_COLOR_SCHEMES: ColorScheme[] = [
  { id: 'neon', name: '霓虹', colors: ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'] },
  { id: 'ocean', name: '海洋', colors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E'] },
  { id: 'sunset', name: '日落', colors: ['#F97316', '#FB923C', '#FBBF24', '#FACC15', '#FDE047'] },
  { id: 'berry', name: '浆果', colors: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'] },
  { id: 'rose', name: '玫瑰', colors: ['#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#FCE7F3'] },
  { id: 'forest', name: '森林', colors: ['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7'] },
  { id: 'warm', name: '暖色', colors: ['#EF4444', '#F97316', '#FBBF24', '#FACC15', '#A3E635'] },
  { id: 'cool', name: '冷色', colors: ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'] },
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: '柱状图' },
  { value: 'line', label: '折线图' },
  { value: 'pie', label: '饼图' },
  { value: 'area', label: '面积图' },
  { value: 'scatter', label: '散点图' },
  { value: 'radar', label: '雷达图' },
  { value: 'mixed', label: '混合图' },
];

const SERIES_TYPES: { value: SeriesType; label: string }[] = [
  { value: 'line', label: '折线' },
  { value: 'bar', label: '柱状' },
  { value: 'scatter', label: '散点' },
  { value: 'area', label: '面积' },
];

export const DEFAULT_CONFIG: ChartConfig = {
  chartType: 'bar',
  colorScheme: PRESET_COLOR_SCHEMES[0],
  customColors: ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'],
  useCustomColors: false,
  title: '数据可视化',
  xAxisLabel: 'X轴',
  yAxisLabel: 'Y轴',
  showLegend: true,
  showGrid: true,
  showDataPoints: true,
  lineWidth: 2,
  dataPointSize: 4,
  opacity: 0.8,
  seriesConfigs: [],
};

const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  config,
  onConfigChange,
  dataKeys = [],
  className = '',
}) => {
  const updateConfig = <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) => {
    onConfigChange({ ...config, [key]: value });
  };

  const updateSeriesConfig = (key: string, updates: Partial<SeriesConfig>) => {
    const existingIndex = config.seriesConfigs.findIndex(s => s.key === key);
    let newConfigs: SeriesConfig[];
    
    if (existingIndex >= 0) {
      newConfigs = config.seriesConfigs.map((s, i) => 
        i === existingIndex ? { ...s, ...updates } : s
      );
    } else {
      const colors = config.useCustomColors ? config.customColors : config.colorScheme.colors;
      newConfigs = [...config.seriesConfigs, { 
        key, 
        color: colors[config.seriesConfigs.length % colors.length],
        type: 'line' as SeriesType,
        visible: true,
        ...updates 
      }];
    }
    
    updateConfig('seriesConfigs', newConfigs);
  };

  const resetToDefault = () => {
    onConfigChange(DEFAULT_CONFIG);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={resetToDefault}
          className="text-xs text-gray-500 hover:text-violet-600 flex items-center space-x-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>重置默认</span>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">图表类型</label>
          <select
            value={config.chartType}
            onChange={(e) => updateConfig('chartType', e.target.value as ChartType)}
            className="input select text-sm"
          >
            {CHART_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">图表标题</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => updateConfig('title', e.target.value)}
            className="input text-sm"
            placeholder="输入图表标题"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">X轴标签</label>
            <input
              type="text"
              value={config.xAxisLabel}
              onChange={(e) => updateConfig('xAxisLabel', e.target.value)}
              className="input text-sm"
              placeholder="X轴"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Y轴标签</label>
            <input
              type="text"
              value={config.yAxisLabel}
              onChange={(e) => updateConfig('yAxisLabel', e.target.value)}
              className="input text-sm"
              placeholder="Y轴"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">颜色方案</label>
          <select
            value={config.colorScheme.id}
            onChange={(e) => {
              const scheme = PRESET_COLOR_SCHEMES.find(s => s.id === e.target.value);
              if (scheme) updateConfig('colorScheme', scheme);
            }}
            className="input select text-sm"
          >
            {PRESET_COLOR_SCHEMES.map((scheme) => (
              <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
            ))}
          </select>
          <div className="flex gap-1 mt-2">
            {config.colorScheme.colors.map((color, index) => (
              <div
                key={index}
                className="w-5 h-5 rounded"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              线宽: {config.lineWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={config.lineWidth}
              onChange={(e) => updateConfig('lineWidth', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              数据点: {config.dataPointSize}px
            </label>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={config.dataPointSize}
              onChange={(e) => updateConfig('dataPointSize', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            透明度: {Math.round(config.opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={config.opacity}
            onChange={(e) => updateConfig('opacity', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">显示选项</label>
          <div className="space-y-2">
            {[
              { key: 'showLegend', label: '显示图例' },
              { key: 'showGrid', label: '显示网格' },
              { key: 'showDataPoints', label: '显示数据点' },
            ].map((item) => (
              <label key={item.key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[item.key as keyof ChartConfig] as boolean}
                  onChange={(e) => updateConfig(item.key as keyof ChartConfig, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-600">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {dataKeys.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">列配置</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {dataKeys.map((key, index) => {
                const seriesConfig = config.seriesConfigs.find(s => s.key === key) || {
                  key,
                  color: (config.useCustomColors ? config.customColors : config.colorScheme.colors)[index % 5],
                  type: 'line' as SeriesType,
                  visible: true,
                };
                return (
                  <div key={key} className="p-2 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 truncate flex-1" title={key}>{key}</span>
                      <label className="flex items-center space-x-1 cursor-pointer ml-2">
                        <input
                          type="checkbox"
                          checked={seriesConfig.visible}
                          onChange={(e) => updateSeriesConfig(key, { visible: e.target.checked })}
                          className="w-3 h-3 rounded border-gray-300 text-violet-600"
                        />
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={seriesConfig.color}
                        onChange={(e) => updateSeriesConfig(key, { color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-gray-200"
                      />
                      <select
                        value={seriesConfig.type}
                        onChange={(e) => updateSeriesConfig(key, { type: e.target.value as SeriesType })}
                        className="flex-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded text-gray-700"
                      >
                        {SERIES_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { PRESET_COLOR_SCHEMES };
export default ChartConfigPanel;
