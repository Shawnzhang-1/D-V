import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = '请选择',
  className = '',
}) => {
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

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const displayText = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? selected[0] 
      : `已选择 ${selected.length} 列`;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border rounded-xl text-sm focus:outline-none transition-colors flex items-center justify-between"
        style={{
          backgroundColor: 'var(--color-background)',
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
          color: selected.length === 0 ? 'var(--color-text-secondary)' : 'var(--color-text)'
        }}
      >
        <span className="truncate">
          {displayText}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-text-secondary)' }}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute z-50 mt-1 w-full border rounded-xl shadow-lg max-h-48 overflow-y-auto"
          style={{
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border)'
          }}
        >
          {options.length === 0 ? (
            <div 
              className="px-3 py-2 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              暂无选项
            </div>
          ) : (
            options.map((option) => (
              <label
                key={option}
                className="flex items-center px-3 py-2 cursor-pointer transition-colors"
                style={{ color: 'var(--color-text)' }}
                onClick={(e) => {
                  e.preventDefault();
                  toggleOption(option);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div 
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    backgroundColor: selected.includes(option) ? 'var(--color-primary)' : 'var(--color-background)',
                    borderColor: selected.includes(option) ? 'var(--color-primary)' : 'var(--color-border)'
                  }}
                >
                  {selected.includes(option) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="ml-2 text-sm truncate" title={option}>
                  {option}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
