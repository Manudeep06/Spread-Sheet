'use client';

import React, { useState } from 'react';
import { WriteState, Document as AppDocument, Cell } from '../firebase/types';

interface ToolbarProps {
  writeState: WriteState;
  selectedCell: string | null;
  onExport: () => void;
  onShare: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onBack: () => void;
  title: string;
  document: AppDocument;
  onCellUpdate: (cellId: string, cell: Cell) => void;
}

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
];

const BG_COLORS = [
  'transparent', '#fef9c3', '#fef3c7', '#ffedd5', '#fee2e2',
  '#dbeafe', '#ede9fe', '#d1fae5', '#f0fdf4', '#e0f2fe',
  '#f3e8ff', '#fce7f3', '#ccfbf1', '#f8fafc', '#f1f5f9',
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export const Toolbar: React.FC<ToolbarProps> = ({
  writeState,
  selectedCell,
  onExport,
  onShare,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onBack,
  title,
  document,
  onCellUpdate,
}) => {
  const [showTextColors, setShowTextColors] = useState(false);
  const [showBgColors, setShowBgColors] = useState(false);

  const selectedCellData = selectedCell ? document.cells[selectedCell] : null;
  const fmt = selectedCellData?.format || {};

  const update = (patch: Partial<typeof fmt>) => {
    if (!selectedCell) return;
    const cell = selectedCellData || { value: '' };
    const newFmt = { ...fmt, ...patch };
    // Sanitize: remove undefined keys
    const sanitized = Object.fromEntries(Object.entries(newFmt).filter(([, v]) => v !== undefined));
    onCellUpdate(selectedCell, { ...cell, format: sanitized });
  };

  const toggle = (key: 'bold' | 'italic' | 'underline' | 'strikethrough') =>
    update({ [key]: !fmt[key] });

  const setAlign = (align: 'left' | 'center' | 'right') =>
    update({ align: fmt.align === align ? undefined : align });

  const setFontSize = (size: number) => update({ fontSize: size });

  const setColor = (color: string) => {
    update({ color });
    setShowTextColors(false);
  };

  const setBgColor = (color: string) => {
    update({ bgColor: color === 'transparent' ? undefined : color });
    setShowBgColors(false);
  };

  // Close pickers when clicking elsewhere
  const closePickers = () => {
    setShowTextColors(false);
    setShowBgColors(false);
  };

  const iconBtn = (active: boolean, onClick: () => void, title: string, content: React.ReactNode) => (
    <button
      onClick={onClick}
      title={title}
      className={`relative p-1.5 rounded-md text-sm transition-all select-none ${active
        ? 'bg-indigo-100 text-indigo-700 font-black shadow-inner'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
    >
      {content}
    </button>
  );

  const divider = <div className="w-px h-4 bg-slate-200 mx-0.5 self-center" />;

  return (
    <div onClick={closePickers} className="glass sticky top-0 z-50 shadow-sm border-b border-slate-200/50">
      {/* Row 1 — Title + sync + action buttons */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center space-x-3">
          {/* Back to workspace */}
          <button
            onClick={onBack}
            title="Back to workspace"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight truncate max-w-[240px]">{title}</h1>
          <div className="flex items-center space-x-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 shadow-sm">
            <div className={`w-2 h-2 rounded-full animate-pulse ${writeState.status === 'saved' ? 'bg-green-500' : 'bg-amber-500'}`} />
            {writeState.status === 'saved' ? 'Saved' : 'Saving…'}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>
          <button
            onClick={onShare}
            className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Row 2 — Formatting controls (Google Sheets style) */}
      <div className="px-3 py-1.5 flex items-center flex-wrap gap-0.5">

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 rounded-md transition-all ${canUndo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1.5 rounded-md transition-all ${canRedo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>

        {divider}

        {/* Font size */}
        <div className="flex items-center border border-slate-200 rounded-md overflow-hidden mr-1">
          <button
            onClick={() => setFontSize(Math.max(8, (fmt.fontSize || 13) - 1))}
            className="px-1.5 py-1 text-slate-500 hover:bg-slate-100 text-xs font-bold"
            title="Decrease font size"
          >−</button>
          <select
            value={fmt.fontSize || 13}
            onChange={(e) => setFontSize(Number(e.target.value))}
            onClick={e => e.stopPropagation()}
            className="w-10 text-center text-xs font-bold text-slate-700 bg-white border-x border-slate-200 focus:outline-none py-1"
            title="Font size"
          >
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setFontSize(Math.min(72, (fmt.fontSize || 13) + 1))}
            className="px-1.5 py-1 text-slate-500 hover:bg-slate-100 text-xs font-bold"
            title="Increase font size"
          >+</button>
        </div>

        {divider}

        {/* Bold */}
        {iconBtn(!!fmt.bold, () => toggle('bold'), 'Bold (B)',
          <span className="font-black text-sm w-4 h-4 flex items-center justify-center">B</span>
        )}

        {/* Italic */}
        {iconBtn(!!fmt.italic, () => toggle('italic'), 'Italic (I)',
          <span className="italic font-semibold text-sm w-4 h-4 flex items-center justify-center">I</span>
        )}

        {/* Underline */}
        {iconBtn(!!fmt.underline, () => toggle('underline'), 'Underline (U)',
          <span className="underline font-semibold text-sm w-4 h-4 flex items-center justify-center">U</span>
        )}

        {/* Strikethrough */}
        {iconBtn(!!fmt.strikethrough, () => toggle('strikethrough'), 'Strikethrough',
          <span className="line-through font-semibold text-sm w-4 h-4 flex items-center justify-center">S</span>
        )}

        {divider}

        {/* Text color */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowTextColors(v => !v); setShowBgColors(false); }}
            className="flex flex-col items-center p-1.5 rounded-md hover:bg-slate-100 transition-all"
            title="Text color"
          >
            <span className="text-sm font-black text-slate-700 leading-none">A</span>
            <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: fmt.color || '#000000' }} />
          </button>
          {showTextColors && (
            <div
              className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 grid grid-cols-5 gap-1 w-36"
              onClick={e => e.stopPropagation()}
            >
              {TEXT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-md border-2 flex-shrink-0 transition-transform hover:scale-110 ${fmt.color === c ? 'border-indigo-500 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        {/* Background color */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowBgColors(v => !v); setShowTextColors(false); }}
            className="flex flex-col items-center p-1.5 rounded-md hover:bg-slate-100 transition-all"
            title="Fill color"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            <div
              className="w-4 h-1 rounded-sm mt-0.5 border border-slate-200"
              style={{ backgroundColor: fmt.bgColor || 'transparent' }}
            />
          </button>
          {showBgColors && (
            <div
              className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 grid grid-cols-5 gap-1 w-36"
              onClick={e => e.stopPropagation()}
            >
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className={`w-5 h-5 rounded-md border-2 flex-shrink-0 transition-transform hover:scale-110 ${(fmt.bgColor === c || (c === 'transparent' && !fmt.bgColor))
                    ? 'border-indigo-500 scale-110' : 'border-slate-200'
                    }`}
                  style={{ backgroundColor: c === 'transparent' ? 'white' : c }}
                  title={c === 'transparent' ? 'None' : c}
                >
                  {c === 'transparent' && (
                    <svg className="w-3 h-3 text-slate-400 m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {divider}

        {/* Text alignment */}
        {iconBtn(fmt.align === 'left', () => setAlign('left'), 'Align left',
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h13" />
          </svg>
        )}
        {iconBtn(fmt.align === 'center', () => setAlign('center'), 'Align center',
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M6 18h12" />
          </svg>
        )}
        {iconBtn(fmt.align === 'right', () => setAlign('right'), 'Align right',
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M8 18h12" />
          </svg>
        )}

        {divider}

        {/* Clear formatting */}
        <button
          onClick={() => {
            if (!selectedCell) return;
            const cell = selectedCellData || { value: '' };
            onCellUpdate(selectedCell, { ...cell, format: {} });
          }}
          title="Clear formatting"
          className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-xs font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Selected cell indicator */}
        <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cell</span>
          <span className="text-xs font-mono font-bold text-indigo-600">{selectedCell || '—'}</span>
        </div>
      </div>
    </div>
  );
};
