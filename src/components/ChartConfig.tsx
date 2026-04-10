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
  enableDualAxis: boolean;
  dualAxisKeys: string[];
}

interface ChartConfigPanelProps {
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  dataKeys?: string[];
  className?: string;
}

const PRESET_COLOR_SCHEMES: ColorScheme[] = [
  { id: 'nord', name: 'Nord 极光', colors: ['#5E81AC', '#81A1C1', '#88C0D0', '#8FBCBB', '#A3BE8C'] },
  { id: 'frost', name: '霜雪', colors: ['#88C0D0', '#8FBCBB', '#81A1C1', '#5E81AC', '#B48EAD'] },
  { id: 'aurora', name: '极光', colors: ['#A3BE8C', '#EBCB8B', '#D08770', '#BF616A', '#B48EAD'] },
  { id: 'polar', name: '极地', colors: ['#ECEFF4', '#D8DEE9', '#81A1C1', '#5E81AC', '#2E3440'] },
  { id: 'snow', name: '雪景', colors: ['#ECEFF4', '#E5E9F0', '#D8DEE9', '#88C0D0', '#81A1C1'] },
  { id: 'winter', name: '冬日', colors: ['#5E81AC', '#81A1C1', '#B48EAD', '#A3BE8C', '#EBCB8B'] },
  { id: 'ice', name: '冰川', colors: ['#88C0D0', '#8FBCBB', '#81A1C1', '#5E81AC', '#4C566A'] },
  { id: 'twilight', name: '暮光', colors: ['#B48EAD', '#81A1C1', '#5E81AC', '#D08770', '#EBCB8B'] },
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
  customColors: ['#5E81AC', '#81A1C1', '#88C0D0', '#8FBCBB', '#A3BE8C'],
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
  enableDualAxis: false,
  dualAxisKeys: [],
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
      const keyIndex = dataKeys.indexOf(key);
      const colorIndex = keyIndex >= 0 ? keyIndex : config.seriesConfigs.length;
      newConfigs = [...config.seriesConfigs, { 
        key, 
        color: colors[colorIndex % colors.length],
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
          className="text-xs text-[#4C566A] hover:text-[#5E81AC] flex items-center space-x-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>重置默认</span>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#4C566A] mb-1">图表类型</label>
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
          <label className="block text-xs font-medium text-[#4C566A] mb-1">图表标题</label>
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
            <label className="block text-xs font-medium text-[#4C566A] mb-1">X轴标签</label>
            <input
              type="text"
              value={config.xAxisLabel}
              onChange={(e) => updateConfig('xAxisLabel', e.target.value)}
              className="input text-sm"
              placeholder="X轴"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4C566A] mb-1">Y轴标签</label>
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
          <label className="block text-xs font-medium text-[#4C566A] mb-1">颜色方案</label>
          <select
            value={config.colorScheme.id}
            onChange={(e) => {
              const scheme = PRESET_COLOR_SCHEMES.find(s => s.id === e.target.value);
              if (scheme) {
                const updatedSeriesConfigs = config.seriesConfigs.map((s, index) => ({
                  ...s,
                  color: scheme.colors[index % scheme.colors.length]
                }));
                onConfigChange({ 
                  ...config, 
                  colorScheme: scheme,
                  seriesConfigs: updatedSeriesConfigs
                });
              }
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
            <label className="block text-xs font-medium text-[#4C566A] mb-1">
              线宽: {config.lineWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={config.lineWidth}
              onChange={(e) => updateConfig('lineWidth', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#D8DEE9] rounded-lg appearance-none cursor-pointer accent-[#5E81AC]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#4C566A] mb-1">
              数据点: {config.dataPointSize}px
            </label>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={config.dataPointSize}
              onChange={(e) => updateConfig('dataPointSize', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#D8DEE9] rounded-lg appearance-none cursor-pointer accent-[#5E81AC]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#4C566A] mb-1">
            透明度: {Math.round(config.opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={config.opacity}
            onChange={(e) => updateConfig('opacity', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#D8DEE9] rounded-lg appearance-none cursor-pointer accent-[#5E81AC]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#4C566A] mb-2">显示选项</label>
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
                  className="w-4 h-4 rounded border-[#D8DEE9] text-[#5E81AC] focus:ring-[#5E81AC]"
                />
                <span className="text-sm text-[#3B4252]">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-[#D8DEE9]">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableDualAxis}
              onChange={(e) => updateConfig('enableDualAxis', e.target.checked)}
              className="w-4 h-4 rounded border-[#D8DEE9] text-[#5E81AC] focus:ring-[#5E81AC]"
            />
            <span className="text-sm font-medium text-[#2E3440]">启用双Y轴</span>
          </label>
          <p className="text-xs text-[#4C566A] mt-1 ml-6">适用于数据范围差异较大的多列数据</p>
          
          {config.enableDualAxis && dataKeys.length > 1 && (
            <div className="mt-3 ml-6 p-3 bg-[#E5E9F0] rounded-lg border border-[#D8DEE9]">
              <label className="block text-xs font-medium text-[#4C566A] mb-2">右侧Y轴数据列</label>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {dataKeys.map((key) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer hover:bg-[#ECEFF4] px-2 py-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={config.dualAxisKeys.includes(key)}
                      onChange={(e) => {
                        const newKeys = e.target.checked
                          ? [...config.dualAxisKeys, key]
                          : config.dualAxisKeys.filter(k => k !== key);
                        updateConfig('dualAxisKeys', newKeys);
                      }}
                      className="w-3 h-3 rounded border-[#D8DEE9] text-[#88C0D0] focus:ring-[#88C0D0]"
                    />
                    <span className="text-xs text-[#3B4252] truncate" title={key}>{key}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[#4C566A] mt-2">
                已选择 {config.dualAxisKeys.length} 列显示在右侧Y轴
              </p>
            </div>
          )}
        </div>

        {dataKeys.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-[#4C566A] mb-2">列配置</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {dataKeys.map((key, index) => {
                const colors = config.useCustomColors ? config.customColors : config.colorScheme.colors;
                const seriesConfig = config.seriesConfigs.find(s => s.key === key) || {
                  key,
                  color: colors[index % colors.length],
                  type: 'line' as SeriesType,
                  visible: true,
                };
                return (
                  <div key={key} className="p-2 rounded-lg bg-[#E5E9F0] border border-[#D8DEE9] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#2E3440] truncate flex-1" title={key}>{key}</span>
                      <label className="flex items-center space-x-1 cursor-pointer ml-2">
                        <input
                          type="checkbox"
                          checked={seriesConfig.visible}
                          onChange={(e) => updateSeriesConfig(key, { visible: e.target.checked })}
                          className="w-3 h-3 rounded border-[#D8DEE9] text-[#5E81AC]"
                        />
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={seriesConfig.color}
                        onChange={(e) => updateSeriesConfig(key, { color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border border-[#D8DEE9]"
                      />
                      <select
                        value={seriesConfig.type}
                        onChange={(e) => updateSeriesConfig(key, { type: e.target.value as SeriesType })}
                        className="flex-1 px-2 py-1 text-xs bg-white border border-[#D8DEE9] rounded text-[#3B4252]"
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
