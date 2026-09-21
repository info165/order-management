import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  // Rough height, used only to decide whether to open upward when there isn't
  // room below the button.
  estimatedHeight: number;
  width?: number;
  children: React.ReactNode;
}

// A dropdown drawn on top of the whole page (not inside the table cell that
// holds the button), so a row near the bottom of a scrolling list can't clip
// it. Opens downward, or upward when there isn't room; closes on an outside
// click, Escape, scroll or resize.
export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  anchorRef,
  open,
  onClose,
  estimatedHeight,
  width = 224,
  children
}) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    let top = rect.bottom + 6;
    if (top + estimatedHeight > window.innerHeight - 8) top = Math.max(8, rect.top - estimatedHeight - 6);
    setPos({ top, left });
  }, [open, anchorRef, width, estimatedHeight]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ top: pos.top, left: pos.left, width }}
      className="fixed z-[300] rounded-xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/40 py-1.5 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};
