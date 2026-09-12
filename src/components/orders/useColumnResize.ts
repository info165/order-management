import React, { useState, useCallback, useRef } from 'react';

export interface ColumnWidthMap {
  [key: string]: number;
}

const DEFAULT_WIDTHS: ColumnWidthMap = {
  select: 38,
  serialNumber: 75,
  contract: 190,
  schoolName: 340,
  category: 160,
  agent: 150,
  orderValue: 130,
  company: 110,
  status: 130,
  dispatch: 195,
  payment: 155,
  action: 70
};

const MIN_WIDTHS: ColumnWidthMap = {
  select: 32,
  serialNumber: 55,
  contract: 130,
  schoolName: 220,
  category: 110,
  agent: 100,
  orderValue: 95,
  company: 85,
  status: 100,
  dispatch: 150,
  payment: 120,
  action: 60
};

const STORAGE_KEY = 'govschool_col_widths_v2';

export function useColumnResize() {
  const [widths, setWidths] = useState<ColumnWidthMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_WIDTHS, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_WIDTHS;
  });

  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const activeColRef = useRef<string | null>(null);

  const startResize = useCallback((colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    activeColRef.current = colKey;
    startXRef.current = e.clientX;
    startWidthRef.current = widths[colKey] || DEFAULT_WIDTHS[colKey] || 100;
    setResizingCol(colKey);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!activeColRef.current) return;
      const deltaX = moveEvent.clientX - startXRef.current;
      const minW = MIN_WIDTHS[activeColRef.current] || 50;
      const newWidth = Math.max(minW, Math.round(startWidthRef.current + deltaX));

      setWidths((prev) => {
        const next = { ...prev, [activeColRef.current!]: newWidth };
        return next;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setResizingCol(null);
      activeColRef.current = null;

      // Persist widths to localStorage
      setWidths((current) => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch (_) {}
        return current;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [widths]);

  const resetWidths = useCallback(() => {
    setWidths(DEFAULT_WIDTHS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  return {
    widths,
    resizingCol,
    startResize,
    resetWidths
  };
}
