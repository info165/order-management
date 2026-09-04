import React, { useState, useRef, useEffect } from 'react';
import { Filter, Search, X, Check, ArrowUp, ArrowDown } from 'lucide-react';

export type FilterType = 'multi-select' | 'numeric' | 'text';

export interface NumericFilterValue {
  mode: 'ANY' | 'GT' | 'LT' | 'BETWEEN' | 'EQ';
  min?: number;
  max?: number;
}

interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
}

interface ColumnFilterPopoverProps {
  columnId: string;
  title: string;
  filterType: FilterType;
  isActive: boolean;
  isOpen: boolean;
  onOpenToggle: () => void;
  onClose: () => void;
  // Multi-select props
  options?: MultiSelectOption[];
  selectedValues?: string[];
  onMultiSelectChange?: (selected: string[]) => void;
  // Numeric props
  numericValue?: NumericFilterValue;
  onNumericChange?: (val: NumericFilterValue) => void;
  // Text search props
  textValue?: string;
  onTextChange?: (val: string) => void;
  // Sorting props
  sortDirection?: 'asc' | 'desc' | null;
  onSortChange?: (direction: 'asc' | 'desc' | null) => void;
  // Clear
  onClearFilter: () => void;
}

export const ColumnFilterPopover: React.FC<ColumnFilterPopoverProps> = ({
  columnId,
  title,
  filterType,
  isActive,
  isOpen,
  onOpenToggle,
  onClose,
  options = [],
  selectedValues = [],
  onMultiSelectChange,
  numericValue = { mode: 'ANY' } as NumericFilterValue,
  onNumericChange,
  textValue = '',
  onTextChange,
  sortDirection,
  onSortChange,
  onClearFilter
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localMin, setLocalMin] = useState<string>(numericValue.min !== undefined ? String(numericValue.min) : '');
  const [localMax, setLocalMax] = useState<string>(numericValue.max !== undefined ? String(numericValue.max) : '');
  const [localMode, setLocalMode] = useState<NumericFilterValue['mode']>(numericValue.mode);
  const [localText, setLocalText] = useState(textValue);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setLocalMin(numericValue.min !== undefined ? String(numericValue.min) : '');
      setLocalMax(numericValue.max !== undefined ? String(numericValue.max) : '');
      setLocalMode(numericValue.mode);
      setLocalText(textValue);
      setSearchQuery('');
    }
  }, [isOpen, numericValue, textValue]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Filtered options for multi-select
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleToggleOption = (val: string) => {
    if (!onMultiSelectChange) return;
    if (selectedValues.includes(val)) {
      onMultiSelectChange(selectedValues.filter(v => v !== val));
    } else {
      onMultiSelectChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (!onMultiSelectChange) return;
    onMultiSelectChange(options.map(o => o.value));
  };

  const handleClearSelection = () => {
    if (!onMultiSelectChange) return;
    onMultiSelectChange([]);
  };

  const handleApplyNumeric = () => {
    if (!onNumericChange) return;
    const minVal = localMin ? Number(localMin) : undefined;
    const maxVal = localMax ? Number(localMax) : undefined;
    onNumericChange({
      mode: localMode,
      min: minVal,
      max: maxVal
    });
    onClose();
  };

  const handleApplyText = () => {
    if (onTextChange) {
      onTextChange(localText);
    }
    onClose();
  };

  return (
    <div className="relative inline-flex items-center" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onOpenToggle}
        title={`Filter & Sort by ${title}`}
        className={`p-1 rounded transition-colors flex items-center justify-center ${
          isActive
            ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs ring-1 ring-amber-400'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
        }`}
      >
        <Filter className={`w-3 h-3 ${isActive ? 'fill-slate-950 stroke-slate-950' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 text-xs font-normal normal-case divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '240px' }}
        >
          {/* Header */}
          <div className="p-2.5 bg-slate-50/80 flex items-center justify-between rounded-t-xl">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              {title} Filter
            </span>
            <div className="flex items-center gap-1">
              {isActive && (
                <button
                  type="button"
                  onClick={() => {
                    onClearFilter();
                    onClose();
                  }}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold px-1.5 py-0.5 rounded hover:bg-rose-50"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Sort Options */}
          {onSortChange && (
            <div className="p-2 flex items-center gap-1.5 bg-slate-50/40">
              <button
                type="button"
                onClick={() => onSortChange(sortDirection === 'asc' ? null : 'asc')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                  sortDirection === 'asc'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowUp className="w-3 h-3 text-slate-500" />
                <span>Sort A-Z (Asc)</span>
              </button>
              <button
                type="button"
                onClick={() => onSortChange(sortDirection === 'desc' ? null : 'desc')}
                className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                  sortDirection === 'desc'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowDown className="w-3 h-3 text-slate-500" />
                <span>Sort Z-A (Desc)</span>
              </button>
            </div>
          )}

          {/* Body based on filterType */}
          {filterType === 'multi-select' && (
            <div className="p-2.5 space-y-2">
              {/* Search within options */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search values..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Select all / Deselect all */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="hover:text-amber-700 font-medium"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="hover:text-amber-700 font-medium"
                >
                  Clear All
                </button>
              </div>

              {/* Option checkboxes */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-50">
                {filteredOptions.length === 0 ? (
                  <div className="text-center py-3 text-slate-400 text-xs">No matching values</div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isChecked = selectedValues.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center justify-between gap-2 py-1 px-1.5 rounded hover:bg-amber-50/50 cursor-pointer select-none text-xs text-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleOption(opt.value)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                          />
                          <span className="truncate" title={opt.label}>
                            {opt.label}
                          </span>
                        </div>
                        {opt.count !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {opt.count}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {selectedValues.length} of {options.length} selected
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {filterType === 'numeric' && (
            <div className="p-2.5 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Condition
                </label>
                <select
                  value={localMode}
                  onChange={(e) => setLocalMode(e.target.value as NumericFilterValue['mode'])}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="ANY">Any Value (No Filter)</option>
                  <option value="GT">Greater than or equal to (≥)</option>
                  <option value="LT">Less than or equal to (≤)</option>
                  <option value="BETWEEN">Between (Min &amp; Max)</option>
                  <option value="EQ">Equals (=)</option>
                </select>
              </div>

              {localMode !== 'ANY' && (
                <div className="space-y-2">
                  {(localMode === 'GT' || localMode === 'BETWEEN' || localMode === 'EQ') && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        {localMode === 'BETWEEN' ? 'Min Value (₹)' : 'Value (₹)'}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={localMin}
                        onChange={(e) => setLocalMin(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  {(localMode === 'LT' || localMode === 'BETWEEN') && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                        {localMode === 'BETWEEN' ? 'Max Value (₹)' : 'Value (₹)'}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 100000"
                        value={localMax}
                        onChange={(e) => setLocalMax(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  {/* Quick Presets */}
                  <div className="pt-1">
                    <div className="text-[10px] text-slate-400 font-medium mb-1">Quick Presets:</div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalMode('GT');
                          setLocalMin('100000');
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-700"
                      >
                        ≥ ₹1,00,000
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalMode('GT');
                          setLocalMin('50000');
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-700"
                      >
                        ≥ ₹50,000
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalMode('LT');
                          setLocalMax('25000');
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-700"
                      >
                        ≤ ₹25,000
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearFilter();
                    onClose();
                  }}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyNumeric}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {filterType === 'text' && (
            <div className="p-2.5 space-y-2">
              <input
                type="text"
                placeholder="Search in this column..."
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyText();
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocalText('');
                    if (onTextChange) onTextChange('');
                    onClose();
                  }}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApplyText}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
