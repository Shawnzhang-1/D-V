import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme, ThemeType, themes } from '../contexts/ThemeContext';

const ThemeSwitcher: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions: { value: ThemeType; label: string; description: string }[] = [
    { value: 'apple', label: 'Apple', description: '极简留白 · 电影质感' },
    { value: 'linear', label: 'Linear', description: '超级极简 · 紫色强调' },
    { value: 'claude', label: 'Claude', description: '温暖智识 · 赭石强调' }
  ];

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          boxShadow: isOpen ? 'var(--shadow-md)' : 'var(--shadow-sm)'
        }}
      >
        <Palette className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
        <span className="text-sm font-medium">{themes[currentTheme].displayName}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-text-secondary)' }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-[var(--radius-lg)] overflow-hidden z-50"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-xl)'
          }}
        >
          <div className="p-2">
            <div 
              className="text-xs font-medium px-3 py-2 mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              选择主题风格
            </div>
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-md)] transition-all duration-200"
                style={{
                  backgroundColor: currentTheme === option.value ? 'var(--color-accent)' : 'transparent',
                  color: currentTheme === option.value ? '#ffffff' : 'var(--color-text)'
                }}
                onMouseEnter={(e) => {
                  if (currentTheme !== option.value) {
                    e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentTheme !== option.value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${themes[option.value].colors.primary}, ${themes[option.value].colors.accent})`,
                    border: currentTheme === option.value ? '2px solid rgba(255,255,255,0.3)' : 'none'
                  }}
                >
                  {currentTheme === option.value && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div 
                    className="text-xs"
                    style={{ 
                      color: currentTheme === option.value ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)'
                    }}
                  >
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
