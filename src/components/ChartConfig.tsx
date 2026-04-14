import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

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

const APPLE_COLOR_SCHEMES: ColorScheme[] = [
  { id: 'apple-classic', name: 'Apple 经典', colors: ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#ff2d55', '#5856d6', '#00c7be', '#30d158', '#64d2ff'] },
  { id: 'apple-vibrant', name: 'Apple 鲜明', colors: ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#0071e3', '#5856d6', '#af52de', '#ff2d55', '#64d2ff'] },
  { id: 'apple-minimal', name: 'Apple 极简', colors: ['#1d1d1f', '#0071e3', '#34c759', '#ff9500', '#86868b', '#5e5e5e', '#0077ed', '#30d158', '#ffcc00', '#f5f5f7'] },
  { id: 'apple-gradient', name: 'Apple 渐变', colors: ['#5ac8fa', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#64d2ff'] },
  { id: 'apple-ios', name: 'Apple iOS', colors: ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30d158', '#007aff', '#5856d6', '#af52de', '#ff2d55'] },
  { id: 'apple-macos', name: 'Apple macOS', colors: ['#ff5f57', '#ffbd2e', '#28ca41', '#0071e3', '#5856d6', '#ff2d55', '#ff9500', '#00c7be', '#64d2ff', '#30d158'] },
  { id: 'apple-watch', name: 'Apple Watch', colors: ['#ff2d55', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#64d2ff', '#30d158'] },
  { id: 'apple-accessibility', name: 'Apple 无障碍', colors: ['#0071e3', '#d50a0a', '#00a854', '#ff8c00', '#6b21a8', '#c41e3a', '#1e40af', '#0f766e', '#b45309', '#166534'] },
];

const LINEAR_COLOR_SCHEMES: ColorScheme[] = [
  { id: 'linear-purple', name: 'Linear 紫', colors: ['#5e6ad2', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#84cc16'] },
  { id: 'linear-dark', name: 'Linear 深色', colors: ['#5e6ad2', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444', '#8b5cf6', '#14b8a6'] },
  { id: 'linear-neon', name: 'Linear 霓虹', colors: ['#22c55e', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6', '#ef4444', '#5e6ad2', '#84cc16'] },
  { id: 'linear-gradient', name: 'Linear 渐变', colors: ['#5e6ad2', '#8b5cf6', '#a855f7', '#c084fc', '#ec4899', '#f472b6', '#22c55e', '#10b981', '#06b6d4', '#14b8a6'] },
  { id: 'linear-cyber', name: 'Linear 赛博', colors: ['#00ffff', '#ff00ff', '#00ff00', '#ffff00', '#ff0080', '#8000ff', '#0080ff', '#ff8000', '#80ff00', '#ff0040'] },
  { id: 'linear-minimal', name: 'Linear 极简', colors: ['#5e6ad2', '#86868b', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16'] },
  { id: 'linear-product', name: 'Linear 产品', colors: ['#5e6ad2', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16'] },
  { id: 'linear-sprint', name: 'Linear 冲刺', colors: ['#22c55e', '#f59e0b', '#ef4444', '#5e6ad2', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#84cc16'] },
];

const CLAUDE_COLOR_SCHEMES: ColorScheme[] = [
  { id: 'claude-warm', name: 'Claude 暖色', colors: ['#d97757', '#16a34a', '#0284c7', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#c026d3', '#059669', '#2563eb'] },
  { id: 'claude-earth', name: 'Claude 大地', colors: ['#d97757', '#92400e', '#065f46', '#1e40af', '#7c2d12', '#b45309', '#0f766e', '#6b21a8', '#166534', '#1d4ed8'] },
  { id: 'claude-editorial', name: 'Claude 编辑', colors: ['#d97757', '#1c1917', '#0284c7', '#16a34a', '#7c3aed', '#dc2626', '#0891b2', '#c026d3', '#059669', '#2563eb'] },
  { id: 'claude-terracotta', name: 'Claude 赭石', colors: ['#d97757', '#b45309', '#92400e', '#78350f', '#dc2626', '#ea580c', '#f59e0b', '#d97706', '#16a34a', '#059669'] },
  { id: 'claude-intellect', name: 'Claude 智识', colors: ['#d97757', '#1c1917', '#0284c7', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#c026d3', '#16a34a', '#2563eb'] },
  { id: 'claude-nature', name: 'Claude 自然', colors: ['#d97757', '#16a34a', '#059669', '#0f766e', '#0891b2', '#0284c7', '#1e40af', '#1d4ed8', '#2563eb', '#7c3aed'] },
  { id: 'claude-sunset', name: 'Claude 日落', colors: ['#d97757', '#ea580c', '#f59e0b', '#dc2626', '#b45309', '#92400e', '#78350f', '#d97706', '#16a34a', '#059669'] },
  { id: 'claude-academic', name: 'Claude 学术', colors: ['#d97757', '#1c1917', '#0284c7', '#1e40af', '#7c3aed', '#6b21a8', '#dc2626', '#16a34a', '#059669', '#0891b2'] },
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
  colorScheme: APPLE_COLOR_SCHEMES[0],
  customColors: ['#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#ff2d55', '#5856d6', '#00c7be', '#30d158', '#64d2ff'],
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
  const { currentTheme } = useTheme();

  const getColorSchemes = (): ColorScheme[] => {
    switch (currentTheme) {
      case 'apple':
        return APPLE_COLOR_SCHEMES;
      case 'linear':
        return LINEAR_COLOR_SCHEMES;
      case 'claude':
        return CLAUDE_COLOR_SCHEMES;
      default:
        return APPLE_COLOR_SCHEMES;
    }
  };

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
    const colorSchemes = getColorSchemes();
    onConfigChange({ ...DEFAULT_CONFIG, colorScheme: colorSchemes[0] });
  };

  const colorSchemes = getColorSchemes();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={resetToDefault}
          className="text-xs flex items-center space-x-1"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
        >
          <RotateCcw className="w-3 h-3" />
          <span>重置默认</span>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>图表类型</label>
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
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>图表标题</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => updateConfig('title', e.target.value)}
            className="input text-sm"
            placeholder="输入图表标题"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>X轴标签</label>
          <input
            type="text"
            value={config.xAxisLabel}
            onChange={(e) => updateConfig('xAxisLabel', e.target.value)}
            className="input text-sm"
            placeholder="输入X轴标签"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Y轴标签</label>
          <input
            type="text"
            value={config.yAxisLabel}
            onChange={(e) => updateConfig('yAxisLabel', e.target.value)}
            className="input text-sm"
            placeholder="输入Y轴标签"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>颜色方案</label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {colorSchemes.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => {
                  const newSeriesConfigs = dataKeys.map((key, idx) => {
                    const existingConfig = config.seriesConfigs.find(s => s.key === key);
                    return {
                      key,
                      color: scheme.colors[idx % scheme.colors.length],
                      type: existingConfig?.type || 'line' as SeriesType,
                      visible: existingConfig?.visible !== false
                    };
                  });
                  onConfigChange({ 
                    ...config, 
                    colorScheme: scheme,
                    seriesConfigs: newSeriesConfigs
                  });
                }}
                className="flex items-center space-x-3 p-2 rounded-lg border transition-all text-left"
                style={{
                  borderColor: config.colorScheme.id === scheme.id ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: config.colorScheme.id === scheme.id ? 'var(--color-surface)' : 'var(--color-background)'
                }}
                onMouseEnter={(e) => {
                  if (config.colorScheme.id !== scheme.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (config.colorScheme.id !== scheme.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-background)';
                  }
                }}
              >
                <div className="flex space-x-1">
                  {scheme.colors.slice(0, 5).map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{scheme.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              线宽: {config.lineWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={config.lineWidth}
              onChange={(e) => updateConfig('lineWidth', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              数据点: {config.dataPointSize}px
            </label>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={config.dataPointSize}
              onChange={(e) => updateConfig('dataPointSize', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            透明度: {Math.round(config.opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={config.opacity}
            onChange={(e) => updateConfig('opacity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>显示选项</label>
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
                  className="w-4 h-4 rounded"
                  style={{ borderColor: 'var(--color-border)', accentColor: 'var(--color-primary)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableDualAxis}
              onChange={(e) => updateConfig('enableDualAxis', e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ borderColor: 'var(--color-border)', accentColor: 'var(--color-primary)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>启用多Y轴</span>
          </label>
          <p className="text-xs mt-1 ml-6" style={{ color: 'var(--color-text-secondary)' }}>选择多列数据分别显示在右侧坐标轴</p>

          {config.enableDualAxis && dataKeys.length > 1 && (
            <div className="mt-3 ml-6 p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>右侧Y轴数据列（可多选，依次向右分布）</label>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {dataKeys.map((key) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer px-2 py-1 rounded transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={config.dualAxisKeys.includes(key)}
                      onChange={(e) => {
                        const newKeys = e.target.checked
                          ? [...config.dualAxisKeys, key]
                          : config.dualAxisKeys.filter(k => k !== key);
                        updateConfig('dualAxisKeys', newKeys);
                      }}
                      className="w-3 h-3 rounded"
                      style={{ borderColor: 'var(--color-border)', accentColor: 'var(--color-accent)' }}
                    />
                    <span className="text-xs truncate" style={{ color: 'var(--color-text)' }} title={key}>{key}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                已选择 {config.dualAxisKeys.length} 列显示在右侧Y轴
              </p>
            </div>
          )}
        </div>

        {dataKeys.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>列配置</label>
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
                  <div key={key} className="p-2 rounded-lg border space-y-2" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate flex-1" style={{ color: 'var(--color-text)' }} title={key}>{key}</span>
                      <label className="flex items-center space-x-1 cursor-pointer ml-2">
                        <input
                          type="checkbox"
                          checked={seriesConfig.visible}
                          onChange={(e) => updateSeriesConfig(key, { visible: e.target.checked })}
                          className="w-3 h-3 rounded"
                          style={{ borderColor: 'var(--color-border)', accentColor: 'var(--color-primary)' }}
                        />
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={seriesConfig.color}
                        onChange={(e) => updateSeriesConfig(key, { color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <select
                        value={seriesConfig.type}
                        onChange={(e) => updateSeriesConfig(key, { type: e.target.value as SeriesType })}
                        className="flex-1 px-2 py-1 text-xs border rounded"
                        style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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

export { APPLE_COLOR_SCHEMES, LINEAR_COLOR_SCHEMES, CLAUDE_COLOR_SCHEMES };
export default ChartConfigPanel;
