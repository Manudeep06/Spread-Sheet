'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Document, Cell } from '../firebase/types';

interface SpreadsheetGridProps {
  document: Document;
  onCellUpdate: (cellId: string, cell: Cell) => void;
  selectedCell: string | null;
  setSelectedCell: (cellId: string | null) => void;
  readOnly?: boolean;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  document,
  onCellUpdate,
  selectedCell,
  setSelectedCell,
  readOnly = false,
}) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [gridSize] = useState({ rows: 50, cols: 26 });
  const [anchorCell, setAnchorCell] = useState<string | null>(null);   // start of range
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null); // end of range (Shift)

  const getColumnName = (index: number): string => {
    let columnName = '';
    while (index >= 0) {
      columnName = String.fromCharCode(65 + (index % 26)) + columnName;
      index = Math.floor(index / 26) - 1;
    }
    return columnName;
  };

  const getCellId = (row: number, col: number): string => {
    return `${getColumnName(col)}${row + 1}`;
  };

  const getCellFromId = (cellId: string): { row: number; col: number } | null => {
    const match = cellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const colStr = match[1];
    const rowStr = match[2];

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col--;

    const row = parseInt(rowStr) - 1;

    return { row, col };
  };

  const getCellValue = (cellId: string, raw: boolean = false): string => {
    const cell = document.cells[cellId];
    if (!cell) return '';
    if (raw) return cell.value || '';
    return (cell.computedValue !== undefined ? cell.computedValue.toString() : cell.value) || '';
  };

  // ── Range helpers ──────────────────────────────────────────────
  const getRangeSet = useCallback((): Set<string> => {
    if (!anchorCell || !selectionEnd) return new Set();
    const a = getCellFromId(anchorCell);
    const b = getCellFromId(selectionEnd);
    if (!a || !b) return new Set();
    const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row);
    const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
    const set = new Set<string>();
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++)
        set.add(getCellId(r, c));
    return set;
  }, [anchorCell, selectionEnd]);

  // ── Paste handler ─────────────────────────────────────────────
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Don't intercept if user is typing in an input
    if (editingCell) return;
    if (!selectedCell) return;
    if (readOnly) return;

    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;

    // Parse TSV: rows split by newline, columns by tab
    const allLines: string[] = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');

    // Remove trailing empty line (common when copying from spreadsheets)
    const rows: string[] = allLines[allLines.length - 1] === ''
      ? allLines.slice(0, -1)
      : allLines;

    if (rows.length === 0) return;

    // Single plain value pasted — let the browser/input handle it naturally
    if (rows.length === 1 && !rows[0].includes('\t')) {
      return;
    }

    e.preventDefault();

    const origin = getCellFromId(selectedCell);
    if (!origin) return;

    const { row: startRow, col: startCol } = origin;

    rows.forEach((rowText: string, rowOffset: number) => {
      const cols = rowText.split('\t');
      cols.forEach((cellText: string, colOffset: number) => {
        const targetRow = startRow + rowOffset;
        const targetCol = startCol + colOffset;
        if (targetRow >= gridSize.rows || targetCol >= gridSize.cols) return;

        const cellId = getCellId(targetRow, targetCol);
        const existing = document.cells[cellId] || { value: '' };
        const isFormula = cellText.startsWith('=');
        const updated: Cell = {
          ...existing,
          value: cellText,
          ...(isFormula ? { formula: cellText } : {}),
        };
        if (!isFormula && 'formula' in updated) {
          delete (updated as { formula?: string }).formula;
        }
        onCellUpdate(cellId, updated);
      });
    });


    // Move selection to bottom-right of pasted range
    const lastRow = Math.min(startRow + rows.length - 1, gridSize.rows - 1);
    const lastCol = Math.min(startCol + (rows[0]?.split('\t').length || 1) - 1, gridSize.cols - 1);
    setSelectedCell(getCellId(lastRow, lastCol));
  }, [editingCell, selectedCell, readOnly, document.cells, getCellFromId, getCellId, gridSize, onCellUpdate, setSelectedCell]);

  // ── Copy handler (copies full range as TSV) ───────────────────
  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (editingCell) return;
    if (!selectedCell) return;
    const rangeSet = getRangeSet();
    if (rangeSet.size <= 1 || !anchorCell || !selectionEnd) {
      // Single cell copy
      const val = getCellValue(selectedCell, true);
      e.clipboardData?.setData('text/plain', val);
      e.preventDefault();
      return;
    }
    // Range copy — build TSV
    const a = getCellFromId(anchorCell)!;
    const b = getCellFromId(selectionEnd)!;
    const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row);
    const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
    const lines: string[] = [];
    for (let r = r1; r <= r2; r++) {
      const cols: string[] = [];
      for (let c = c1; c <= c2; c++) cols.push(getCellValue(getCellId(r, c), true));
      lines.push(cols.join('\t'));
    }
    e.clipboardData?.setData('text/plain', lines.join('\n'));
    e.preventDefault();
  }, [editingCell, selectedCell, anchorCell, selectionEnd, getRangeSet]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    window.addEventListener('copy', handleCopy);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('copy', handleCopy);
    };
  }, [handlePaste, handleCopy]);
  // ──────────────────────────────────────────────────────────────


  const handleCellClick = (cellId: string, shiftKey: boolean = false) => {
    // While editing formula: clicking appends cell reference
    if (editingCell && editValue.startsWith('=')) {
      setEditValue(prev => {
        if (/[+\-*/(,:]$/.test(prev)) return prev + cellId;
        return prev + (prev.length > 1 ? ',' : '') + cellId;
      });
      return;
    }
    // Commit any in-progress edit when clicking away
    if (editingCell && editingCell !== cellId) handleCellBlur();

    if (shiftKey && anchorCell) {
      // Extend the selection range
      setSelectionEnd(cellId);
      setSelectedCell(cellId);
    } else {
      // New selection — anchor = this cell
      setAnchorCell(cellId);
      setSelectionEnd(null);
      setSelectedCell(cellId);
    }
  };

  const handleCellDoubleClick = (cellId: string) => {
    if (readOnly) return;
    setAnchorCell(cellId);
    setSelectionEnd(null);
    setSelectedCell(cellId);
    setEditingCell(cellId);
    setEditValue(getCellValue(cellId, true));
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const existingCell = document.cells[editingCell];
      const isFormula = editValue.startsWith('=');
      const cell: Cell = {
        ...existingCell,
        value: editValue,
        // Only set the formula field when there IS a formula — never set it to undefined
        ...(isFormula ? { formula: editValue } : { formula: undefined }),
      };
      // Strip undefined keys so Firestore doesn't complain
      const sanitizedCell = Object.fromEntries(
        Object.entries(cell).filter(([, v]) => v !== undefined)
      ) as Cell;
      onCellUpdate(editingCell, sanitizedCell);
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, cellId: string) => {
    const cell = getCellFromId(cellId);
    if (!cell) return;

    const { row, col } = cell;
    const isEditing = editingCell === cellId;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isEditing) {
        handleCellBlur();
        const nextCellId = getCellId(Math.min(row + 1, gridSize.rows - 1), col);
        setSelectedCell(nextCellId);
      } else {
        setEditingCell(cellId);
        setEditValue(getCellValue(cellId, true));
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (isEditing) handleCellBlur();
      const nextCellId = getCellId(row, Math.min(col + 1, gridSize.cols - 1));
      setSelectedCell(nextCellId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (!isEditing) {
      // Arrow-key navigation when not editing
      let nextRow = row;
      let nextCol = col;
      let handled = false;

      if (e.key === 'ArrowUp') { nextRow = Math.max(0, row - 1); handled = true; }
      else if (e.key === 'ArrowDown') { nextRow = Math.min(gridSize.rows - 1, row + 1); handled = true; }
      else if (e.key === 'ArrowLeft') { nextCol = Math.max(0, col - 1); handled = true; }
      else if (e.key === 'ArrowRight') { nextCol = Math.min(gridSize.cols - 1, col + 1); handled = true; }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!readOnly) {
          // Delete all cells in the current selection range
          const rangeSet = getRangeSet();
          const targets = rangeSet.size > 0 ? Array.from(rangeSet) : [cellId];
          targets.forEach(id => {
            const existing = document.cells[id];
            if (existing) onCellUpdate(id, { ...existing, value: '', formula: undefined });
          });
        }
        handled = true;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !readOnly) {
        e.preventDefault();
        setAnchorCell(cellId);
        setSelectionEnd(null);
        setEditingCell(cellId);
        setEditValue(e.key);
        return;
      }

      if (handled) {
        e.preventDefault();
        const nextId = getCellId(nextRow, nextCol);
        if (e.shiftKey) {
          // Shift+Arrow extends selection
          setSelectionEnd(nextId);
          setSelectedCell(nextId);
        } else {
          setAnchorCell(nextId);
          setSelectionEnd(null);
          setSelectedCell(nextId);
        }
      }
    }
  };

  const renderCell = (row: number, col: number) => {
    const cellId = getCellId(row, col);
    const value = getCellValue(cellId);
    const cellData = document.cells[cellId];
    const isAnchor = selectedCell === cellId;
    const isEditing = editingCell === cellId;
    const rangeSet = getRangeSet();
    const isInRange = rangeSet.size > 1 && rangeSet.has(cellId);
    const isSelected = isAnchor || isInRange;

    const fmt = cellData?.format;
    const style: React.CSSProperties = {
      fontWeight: fmt?.bold ? 'bold' : 'normal',
      fontStyle: fmt?.italic ? 'italic' : 'normal',
      textDecoration: [
        fmt?.underline ? 'underline' : '',
        fmt?.strikethrough ? 'line-through' : '',
      ].filter(Boolean).join(' ') || 'none',
      color: fmt?.color || 'inherit',
      backgroundColor: fmt?.bgColor || 'transparent',
      textAlign: fmt?.align || 'left',
      fontSize: fmt?.fontSize ? `${fmt.fontSize}px` : '13px',
    };

    return (
      <div
        key={cellId}
        className={`border-b border-r border-slate-200 relative min-h-[32px] transition-colors duration-75 select-none ${isEditing
            ? 'z-20'
            : isAnchor
              ? 'z-10 ring-2 ring-inset ring-indigo-500'
              : isInRange
                ? 'bg-indigo-50/70 ring-1 ring-inset ring-indigo-300'
                : 'hover:bg-slate-50/50 cursor-cell'
          }`}
        style={{ backgroundColor: isInRange && !fmt?.bgColor ? 'rgba(99,102,241,0.08)' : fmt?.bgColor || undefined }}
        onClick={(e) => handleCellClick(cellId, e.shiftKey)}
        onDoubleClick={() => handleCellDoubleClick(cellId)}
        onKeyDown={(e) => isSelected && handleKeyDown(e, cellId)}
        tabIndex={isSelected ? 0 : -1}
      >
        {isEditing && !readOnly ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, cellId)}
            className="w-full h-full px-2 py-1 bg-white border-none outline-none font-medium text-slate-900 shadow-inner"
            autoFocus
            style={{ ...style, backgroundColor: 'white' }}
          />
        ) : (
          <div
            className="px-2 py-1 h-full flex items-center font-medium text-slate-700 overflow-hidden"
            style={{ ...style, backgroundColor: 'transparent' }}
          >
            {value}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 custom-scrollbar">
      <div className="inline-block min-w-full">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `40px repeat(${gridSize.cols}, 120px)`,
            width: 'max-content'
          }}
        >
          {/* Top Left Header Column */}
          <div className="sticky top-0 left-0 z-30 border-b border-r border-slate-200 bg-slate-50/80 backdrop-blur-md p-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            ID
          </div>

          {/* Column Headers */}
          {Array.from({ length: gridSize.cols }, (_, i) => (
            <div
              key={i}
              className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50/80 backdrop-blur-md p-2 text-center text-xs font-bold text-slate-600"
            >
              {getColumnName(i)}
            </div>
          ))}

          {/* Rows */}
          {Array.from({ length: gridSize.rows }, (_, row) => (
            <React.Fragment key={row}>
              {/* Row Header */}
              <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50/80 backdrop-blur-md p-2 text-center text-xs font-bold text-slate-500">
                {row + 1}
              </div>

              {/* Row Cells */}
              {Array.from({ length: gridSize.cols }, (_, col) => renderCell(row, col))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
