'use client';

import React, { useState } from 'react';
import { Document, Cell } from '../firebase/types';

interface SpreadsheetGridProps {
  document: Document;
  onCellUpdate: (cellId: string, cell: Cell) => void;
  selectedCell: string | null;
  setSelectedCell: (cellId: string | null) => void;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  document,
  onCellUpdate,
  selectedCell,
  setSelectedCell,
}) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [gridSize] = useState({ rows: 50, cols: 26 });

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

  const handleCellClick = (cellId: string) => {
    setSelectedCell(cellId);
    setEditingCell(cellId);
    setEditValue(getCellValue(cellId, true));
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const existingCell = document.cells[editingCell];
      const cell: Cell = {
        ...existingCell,
        value: editValue,
        formula: editValue.startsWith('=') ? editValue : undefined,
      };
      onCellUpdate(editingCell, cell);
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
      // Navigation keys when not editing
      let nextRow = row;
      let nextCol = col;
      let handled = false;

      if (e.key === 'ArrowUp') {
        nextRow = Math.max(0, row - 1);
        handled = true;
      } else if (e.key === 'ArrowDown') {
        nextRow = Math.min(gridSize.rows - 1, row + 1);
        handled = true;
      } else if (e.key === 'ArrowLeft') {
        nextCol = Math.max(0, col - 1);
        handled = true;
      } else if (e.key === 'ArrowRight') {
        nextCol = Math.min(gridSize.cols - 1, col + 1);
        handled = true;
      }

      if (handled) {
        e.preventDefault();
        setSelectedCell(getCellId(nextRow, nextCol));
      }
    }
  };

  const renderCell = (row: number, col: number) => {
    const cellId = getCellId(row, col);
    const value = getCellValue(cellId);
    const cellData = document.cells[cellId];
    const isSelected = selectedCell === cellId;
    const isEditing = editingCell === cellId;

    const style: React.CSSProperties = {
      fontWeight: cellData?.format?.bold ? 'bold' : 'normal',
      fontStyle: cellData?.format?.italic ? 'italic' : 'normal',
    };

    return (
      <div
        key={cellId}
        className={`border-b border-r border-slate-200 relative cursor-pointer min-h-[32px] transition-all duration-150 ${
          isSelected ? 'z-10 ring-2 ring-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'hover:bg-slate-50/50'
        }`}
        onClick={() => !isEditing && handleCellClick(cellId)}
        onKeyDown={(e) => !isEditing && isSelected && handleKeyDown(e, cellId)}
        tabIndex={isSelected ? 0 : -1}
      >
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, cellId)}
            className="w-full h-full px-2 py-1 text-sm bg-white border-none outline-none font-medium text-slate-900 shadow-inner"
            autoFocus
            style={style}
          />
        ) : (
          <div 
            className="px-2 py-1 text-sm h-full flex items-center font-medium text-slate-700"
            style={style}
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
