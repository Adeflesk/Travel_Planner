'use client';

import { useState, useEffect, useRef, forwardRef, useCallback, useMemo } from 'react';
import { Input } from './Input';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type InputSize = 'sm' | 'md' | 'lg';

interface BaseInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: InputSize;
}

interface AutocompleteInputProps extends BaseInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onSelect'> {
  suggestions: string[];
  onSelect: (value: string) => void;
  filterMethod?: 'startsWith' | 'contains';
  showRecentFirst?: boolean;
  recentItems?: string[];
  loading?: boolean;
  emptyMessage?: string;
  virtualize?: boolean;
}

export const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  (
    {
      suggestions = [],
      onSelect,
      filterMethod = 'contains',
      showRecentFirst = true,
      recentItems = [],
      loading = false,
      emptyMessage = 'No suggestions found. Start typing to create new.',
      virtualize,
      value,
      onChange,
      onFocus,
      onBlur,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      className = '',
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter suggestions based on input value using useMemo instead of useEffect
    const filteredSuggestions = useMemo(() => {
      if (!value || typeof value !== 'string') {
        return suggestions;
      }

      const inputValue = value.toLowerCase();
      return suggestions.filter((suggestion) => {
        const suggestionLower = suggestion.toLowerCase();
        if (filterMethod === 'startsWith') {
          return suggestionLower.startsWith(inputValue);
        }
        return suggestionLower.includes(inputValue);
      });
    }, [value, suggestions, filterMethod]);

    // Reset selected index when filtered suggestions change
    useEffect(() => {
      // Synchronize selectedIndex with filtered list - valid use case for effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIndex(-1);
    }, [filteredSuggestions]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsOpen(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      // Delay to allow click events on dropdown to fire
      setTimeout(() => {
        if (!dropdownRef.current?.contains(document.activeElement)) {
          setIsOpen(false);
        }
      }, 200);
      onBlur?.(e);
    }, [onBlur]);

    const handleSuggestionClick = useCallback((suggestion: string) => {
      onSelect(suggestion);
      setIsOpen(false);
      setSelectedIndex(-1);
    }, [onSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown') {
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
            handleSuggestionClick(filteredSuggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    }, [isOpen, selectedIndex, filteredSuggestions, handleSuggestionClick]);

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIndex >= 0 && dropdownRef.current) {
        const selectedElement = dropdownRef.current.querySelector(
          `[data-index="${selectedIndex}"]`
        );
        selectedElement?.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    // Organize suggestions into recent and other
    const recentSuggestions = showRecentFirst
      ? filteredSuggestions.filter((s) => recentItems.includes(s))
      : [];
    const otherSuggestions = showRecentFirst
      ? filteredSuggestions.filter((s) => !recentItems.includes(s))
      : filteredSuggestions;

    const hasResults = filteredSuggestions.length > 0;
    const showDropdown = isOpen && (hasResults || loading);

    // Custom right icon: show loader if loading, otherwise use provided rightIcon
    const displayRightIcon = loading ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      rightIcon
    );

    return (
      <div className="relative w-full">
        <Input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          label={label}
          error={error}
          hint={hint}
          leftIcon={leftIcon}
          rightIcon={displayRightIcon}
          inputSize={inputSize}
          value={value}
          onChange={onChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={className}
          {...props}
        />

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {loading ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                Loading suggestions...
              </div>
            ) : hasResults ? (
              <>
                {recentSuggestions.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-200">
                      Recent
                    </div>
                    {recentSuggestions.map((suggestion) => {
                      const globalIndex = filteredSuggestions.indexOf(suggestion);
                      return (
                        <button
                          key={`recent-${suggestion}`}
                          data-index={globalIndex}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 focus:bg-primary-50 focus:outline-none ${
                            selectedIndex === globalIndex
                              ? 'bg-primary-100 text-primary-900'
                              : 'text-slate-700'
                          }`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>
                )}

                {otherSuggestions.length > 0 && (
                  <div>
                    {recentSuggestions.length > 0 && (
                      <div className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-200">
                        Suggested
                      </div>
                    )}
                    {otherSuggestions.map((suggestion) => {
                      const globalIndex = filteredSuggestions.indexOf(suggestion);
                      return (
                        <button
                          key={`other-${suggestion}`}
                          data-index={globalIndex}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 focus:bg-primary-50 focus:outline-none ${
                            selectedIndex === globalIndex
                              ? 'bg-primary-100 text-primary-900'
                              : 'text-slate-700'
                          }`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                {emptyMessage}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

AutocompleteInput.displayName = 'AutocompleteInput';

export default AutocompleteInput;
