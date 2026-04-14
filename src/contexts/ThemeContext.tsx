import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'apple' | 'linear' | 'claude';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  error: string;
  chartColors: string[];
}

export interface Theme {
  name: ThemeType;
  displayName: string;
  colors: ThemeColors;
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
}

const themes: Record<ThemeType, Theme> = {
  apple: {
    name: 'apple',
    displayName: 'Apple',
    colors: {
      primary: '#0071e3',
      primaryHover: '#0077ed',
      secondary: '#1d1d1f',
      background: '#ffffff',
      surface: '#f5f5f7',
      surfaceHover: '#e8e8ed',
      border: '#d2d2d7',
      borderLight: '#e8e8ed',
      text: '#1d1d1f',
      textSecondary: '#86868b',
      textTertiary: '#aeaeb2',
      accent: '#0071e3',
      accentHover: '#0077ed',
      success: '#34c759',
      warning: '#ff9500',
      error: '#ff3b30',
      chartColors: [
        '#0071e3',
        '#34c759',
        '#ff9500',
        '#ff3b30',
        '#af52de',
        '#ff2d55',
        '#5856d6',
        '#ff9500',
        '#00c7be',
        '#30d158'
      ]
    },
    borderRadius: {
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '18px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
      md: '0 4px 12px rgba(0, 0, 0, 0.08)',
      lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
      xl: '0 16px 48px rgba(0, 0, 0, 0.16)'
    },
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '15px',
      lg: '17px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px'
    }
  },
  linear: {
    name: 'linear',
    displayName: 'Linear',
    colors: {
      primary: '#5e6ad2',
      primaryHover: '#6e7ae2',
      secondary: '#9ca3af',
      background: '#0f0f0f',
      surface: '#1a1a1a',
      surfaceHover: '#242424',
      border: '#2a2a2a',
      borderLight: '#1f1f1f',
      text: '#f5f5f5',
      textSecondary: '#9ca3af',
      textTertiary: '#6b7280',
      accent: '#5e6ad2',
      accentHover: '#6e7ae2',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      chartColors: [
        '#5e6ad2',
        '#22c55e',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899',
        '#06b6d4',
        '#f97316',
        '#14b8a6',
        '#84cc16'
      ]
    },
    borderRadius: {
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
      md: '0 2px 8px rgba(0, 0, 0, 0.4)',
      lg: '0 4px 16px rgba(0, 0, 0, 0.5)',
      xl: '0 8px 32px rgba(0, 0, 0, 0.6)'
    },
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '22px',
      '3xl': '28px'
    }
  },
  claude: {
    name: 'claude',
    displayName: 'Claude',
    colors: {
      primary: '#d97757',
      primaryHover: '#e58767',
      secondary: '#9ca3af',
      background: '#fafaf9',
      surface: '#ffffff',
      surfaceHover: '#f5f5f4',
      border: '#e7e5e4',
      borderLight: '#f5f5f4',
      text: '#1c1917',
      textSecondary: '#78716c',
      textTertiary: '#a8a29e',
      accent: '#d97757',
      accentHover: '#e58767',
      success: '#16a34a',
      warning: '#ea580c',
      error: '#dc2626',
      chartColors: [
        '#d97757',
        '#16a34a',
        '#0284c7',
        '#7c3aed',
        '#dc2626',
        '#ea580c',
        '#0891b2',
        '#c026d3',
        '#059669',
        '#2563eb'
      ]
    },
    borderRadius: {
      sm: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 3px rgba(28, 25, 23, 0.08)',
      md: '0 4px 12px rgba(28, 25, 23, 0.1)',
      lg: '0 8px 24px rgba(28, 25, 23, 0.12)',
      xl: '0 16px 48px rgba(28, 25, 23, 0.16)'
    },
    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '21px',
      '2xl': '26px',
      '3xl': '34px'
    }
  }
};

interface ThemeContextType {
  currentTheme: ThemeType;
  theme: Theme;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeType) || 'apple';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', currentTheme);
    const root = document.documentElement;
    const theme = themes[currentTheme];
    
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-primary-hover', theme.colors.primaryHover);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-surface-hover', theme.colors.surfaceHover);
    root.style.setProperty('--color-border', theme.colors.border);
    root.style.setProperty('--color-border-light', theme.colors.borderLight);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-text-tertiary', theme.colors.textTertiary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-accent-hover', theme.colors.accentHover);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);
    
    theme.colors.chartColors.forEach((color: string, index: number) => {
      root.style.setProperty(`--chart-color-${index}`, color);
    });
    
    root.style.setProperty('--radius-sm', theme.borderRadius.sm);
    root.style.setProperty('--radius-md', theme.borderRadius.md);
    root.style.setProperty('--radius-lg', theme.borderRadius.lg);
    root.style.setProperty('--radius-xl', theme.borderRadius.xl);
    root.style.setProperty('--radius-full', theme.borderRadius.full);
    
    root.style.setProperty('--shadow-sm', theme.shadows.sm);
    root.style.setProperty('--shadow-md', theme.shadows.md);
    root.style.setProperty('--shadow-lg', theme.shadows.lg);
    root.style.setProperty('--shadow-xl', theme.shadows.xl);
    
    root.style.setProperty('--font-family', theme.fontFamily);
    root.style.setProperty('--font-size-xs', theme.fontSize.xs);
    root.style.setProperty('--font-size-sm', theme.fontSize.sm);
    root.style.setProperty('--font-size-base', theme.fontSize.base);
    root.style.setProperty('--font-size-lg', theme.fontSize.lg);
    root.style.setProperty('--font-size-xl', theme.fontSize.xl);
    root.style.setProperty('--font-size-2xl', theme.fontSize['2xl']);
    root.style.setProperty('--font-size-3xl', theme.fontSize['3xl']);
    
    root.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const setTheme = (theme: ThemeType) => {
    setCurrentTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, theme: themes[currentTheme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { themes };
