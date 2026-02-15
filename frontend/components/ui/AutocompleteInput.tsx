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
  virtualItemHeight?: number;
  virtualMaxItems?: number;
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
      virtualize = false,
      virtualItemHeight = 36,
      virtualMaxItems = 8,
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
    const [scrollTop, setScrollTop] = useState(0);
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
        if (virtualize) {
          const containerHeight = Math.min(filteredSuggestions.length, virtualMaxItems)
            * virtualItemHeight;
          const itemTop = selectedIndex * virtualItemHeight;
          const itemBottom = itemTop + virtualItemHeight;
          const currentTop = dropdownRef.current.scrollTop;
          const currentBottom = currentTop + containerHeight;

          if (itemTop < currentTop) {
            dropdownRef.current.scrollTop = itemTop;
          } else if (itemBottom > currentBottom) {
            dropdownRef.current.scrollTop = itemBottom - containerHeight;
          }
        } else {
          const selectedElement = dropdownRef.current.querySelector(
            `[data-index="${selectedIndex}"]`
          );
          selectedElement?.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [selectedIndex, filteredSuggestions.length, virtualItemHeight, virtualMaxItems, virtualize]);

    const visibleRange = useMemo(() => {
      if (!virtualize) {
        return { startIndex: 0, endIndex: filteredSuggestions.length };
      }

      const startIndex = Math.floor(scrollTop / virtualItemHeight);
      const endIndex = Math.min(
        startIndex + virtualMaxItems,
        filteredSuggestions.length
      );
      return { startIndex, endIndex };
    }, [filteredSuggestions.length, scrollTop, virtualItemHeight, virtualMaxItems, virtualize]);

    const virtualTopPadding = virtualize
      ? visibleRange.startIndex * virtualItemHeight
      : 0;
    const virtualBottomPadding = virtualize
      ? (filteredSuggestions.length - visibleRange.endIndex) * virtualItemHeight
      : 0;

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
            onScroll={virtualize ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg overflow-y-auto"
            style={virtualize
              ? { maxHeight: Math.min(filteredSuggestions.length, virtualMaxItems) * virtualItemHeight }
              : { maxHeight: '15rem' }
            }
          >
            {loading ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                Loading suggestions...
              </div>
            ) : hasResults ? (
              virtualize ? (
                <div
                  style={{
                    paddingTop: virtualTopPadding,
                    paddingBottom: virtualBottomPadding,
                  }}
                >
                  {filteredSuggestions
                    .slice(visibleRange.startIndex, visibleRange.endIndex)
                    .map((suggestion, index) => {
                      const globalIndex = visibleRange.startIndex + index;
                      return (
                        <button
                          key={`virtual-${suggestion}-${globalIndex}`}
                          data-index={globalIndex}
                          type="button"
                          className={`w-full text-left px-3 h-9 flex items-center text-sm hover:bg-primary-50 focus:bg-primary-50 focus:outline-none ${
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
              ) : (
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
              )
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
