import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface CheckboxFilterOption {
  value: string;
  label: string;
  // Optional badge shown on the right, e.g. how many orders this school has.
  count?: number;
}

interface CheckboxFilterDropdownProps {
  // Shown as "All <allLabel> (N)" when nothing is ticked, e.g. "Schools".
  allLabel: string;
  // Singular / plural nouns for the "3 schools selected" wording.
  noun: { one: string; many: string };
  options: CheckboxFilterOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  // Keeps the trigger from growing wider than the toolbar has room for.
  maxTriggerWidthClass?: string;
}

// A dropdown that opens a searchable list of checkboxes, for filtering a table
// by several values at once (e.g. 3 or 7 schools). It only reports the ticked
// values through onChange - it never reads or writes any data itself, so it is
// purely a view filter.
export const CheckboxFilterDropdown: React.FC<CheckboxFilterDropdownProps> = ({
  allLabel,
  noun,
  options,
  selectedValues,
  onChange,
  maxTriggerWidthClass = 'max-w-[210px]'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isActive = selectedValues.length > 0;

  const close = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  // Click outside closes the list.
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // Focus the search box when the list opens.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, searchQuery]);

  // The count and label always mirror the real filter state (selectedValues),
  // so the button can never say "All" while the table is still filtered.
  const validSelected = selectedValues;

  const toggle = (value: string) => {
    if (selectedValues.includes(value)) onChange(selectedValues.filter(v => v !== value));
    else onChange([...selectedValues, value]);
  };

  const selectAllShown = () => {
    onChange(Array.from(new Set([...selectedValues, ...filteredOptions.map(o => o.value)])));
  };

  const clearShown = () => {
    if (!searchQuery.trim()) {
      onChange([]);
      return;
    }
    const shown = new Set(filteredOptions.map(o => o.value));
    onChange(selectedValues.filter(v => !shown.has(v)));
  };

  const triggerLabel =
    validSelected.length === 0
      ? `All ${allLabel} (${options.length})`
      : validSelected.length === 1
        ? (options.find(o => o.value === validSelected[0])?.label || validSelected[0])
        : `${validSelected.length} ${noun.many} selected`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={isActive ? `Filtering by ${validSelected.length} ${validSelected.length === 1 ? noun.one : noun.many}` : `Filter by ${noun.many}`}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500 ${maxTriggerWidthClass} ${
          isActive
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 text-xs font-normal divide-y divide-slate-100"
          role="listbox"
          aria-multiselectable="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        >
          <div className="p-2.5 bg-slate-50/80 flex items-center justify-between rounded-t-xl">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Filter by {noun.many}
            </span>
            <button type="button" onClick={close} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700" title="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2.5 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${noun.many}...`}
                className="w-full pl-7 pr-7 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 px-1 text-[11px]">
              <button type="button" onClick={selectAllShown} className="font-semibold text-slate-700 hover:text-amber-700 hover:underline">
                {searchQuery.trim() ? `Select all shown (${filteredOptions.length})` : 'Select all'}
              </button>
              <span className="text-slate-300">•</span>
              <button type="button" onClick={clearShown} className="font-medium text-slate-500 hover:text-amber-700 hover:underline">
                Clear
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-4 text-slate-400">No matching {noun.many}</div>
              ) : (
                filteredOptions.map(opt => {
                  const checked = selectedValues.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      role="option"
                      aria-selected={checked}
                      className={`flex items-center justify-between gap-2 py-1.5 px-1.5 rounded cursor-pointer select-none text-slate-800 ${
                        checked ? 'bg-amber-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(opt.value)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 shrink-0"
                        />
                        <span className="truncate" title={opt.label}>{opt.label}</span>
                      </span>
                      {opt.count !== undefined && (
                        <span className="text-[10px] text-slate-400 font-mono shrink-0" title={`${opt.count} order${opt.count === 1 ? '' : 's'}`}>
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
                {validSelected.length} of {options.length} selected
              </span>
              <button
                type="button"
                onClick={close}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
