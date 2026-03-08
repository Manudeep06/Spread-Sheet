'use client';

import React from 'react';
import { WriteState, Document as AppDocument, Cell } from '../firebase/types';

interface ToolbarProps {
  writeState: WriteState;
  selectedCell: string | null;
  onExport: () => void;
  title: string;
  document: AppDocument;
  onCellUpdate: (cellId: string, cell: Cell) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  writeState, 
  selectedCell, 
  onExport, 
  title,
  document,
  onCellUpdate
}) => {
  const selectedCellData = selectedCell ? document.cells[selectedCell] : null;

  const toggleStyle = (style: 'bold' | 'italic' | 'color', value?: string) => {
    if (!selectedCell) return;
    
    const cell = selectedCellData || { value: '' };
    const newFormat = { ...(cell.format || {}) };
    
    if (style === 'bold') newFormat.bold = !newFormat.bold;
    if (style === 'italic') newFormat.italic = !newFormat.italic;
    if (style === 'color') newFormat.color = newFormat.color === value ? undefined : value;
    
    onCellUpdate(selectedCell, { ...cell, format: newFormat });
  };

  return (
    <div className="glass sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm border-b border-slate-200/50">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3 pr-6 border-r border-slate-200">
          {/* ... icon and title ... */}
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate max-w-[200px]">
            {title}
          </h1>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          {/* Formatting Buttons */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => toggleStyle('bold')}
              className={`p-2 rounded-lg transition-all ${
                selectedCellData?.format?.bold 
                  ? 'bg-white text-indigo-600 shadow-sm font-black' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => toggleStyle('italic')}
              className={`p-2 rounded-lg transition-all ${
                selectedCellData?.format?.italic 
                  ? 'bg-white text-indigo-600 shadow-sm italic' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Italic"
            >
              I
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button
              onClick={() => toggleStyle('color', '#4f46e5')}
              className={`p-2 rounded-lg transition-all flex items-center space-x-1 ${
                selectedCellData?.format?.color === '#4f46e5'
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Indigo Color"
            >
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
            </button>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cell</span>
            <span className="text-sm font-mono font-bold text-indigo-600">
              {selectedCell || '--'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              writeState.status === 'saved' ? 'bg-green-500' : 'bg-amber-500'
            }`}></div>
            <span className="text-xs font-semibold text-slate-500">
              {writeState.status === 'saved' ? 'Synchronized' : 'Syncing...'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button
          onClick={onExport}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
};
