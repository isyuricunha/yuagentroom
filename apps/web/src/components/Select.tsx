import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  allowCustom?: boolean;
}

export function Select({ value, onChange, options, placeholder = 'Select...', allowCustom = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef(value);

  useLayoutEffect(() => {
    if (prevValueRef.current !== value) {
      setInputValue(value);
      prevValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (allowCustom && inputValue !== value) {
          onChange(inputValue);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allowCustom, inputValue, onChange, value]);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = allowCustom ? inputValue : (selectedOption ? selectedOption.label : '');

  const filteredOptions = allowCustom 
    ? options.filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()) || o.value.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  return (
    <div className="custom-select-container" ref={containerRef}>
      <div 
        className={`custom-select-trigger input glow-input ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        {allowCustom ? (
          <input
            type="text"
            className="custom-select-input"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChange(inputValue);
                setIsOpen(false);
              }
            }}
          />
        ) : (
          <div className="custom-select-value">
            {displayValue || <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>}
          </div>
        )}
        <ChevronDown size={14} className={`dropdown-icon ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && (
        <div className="custom-select-menu slide-up">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`custom-select-item ${opt.value === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setInputValue(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="custom-select-empty">No matching options</div>
          )}
        </div>
      )}
    </div>
  );
}
