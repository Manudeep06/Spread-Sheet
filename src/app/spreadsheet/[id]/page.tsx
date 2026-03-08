'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { subscribeToDocument, updateCell, updatePresence, removePresence, subscribeToPresence } from '../../firebase/firestore';
import { Document as AppDocument, Cell, Presence, WriteState } from '../../firebase/types';
import { SpreadsheetGrid } from '../../components/SpreadsheetGrid';
import { Toolbar } from '../../components/Toolbar';
import { PresenceList } from '../../components/PresenceList';
import { ShareModal } from '../../components/ShareModal';
import { evaluateFormula } from '../../utils/formulas';

function SpreadsheetPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const documentId = params.id as string;

  const [document, setAppDocument] = useState<AppDocument | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [writeState, setWriteState] = useState<WriteState>({ status: 'saved' });
  const [mounted, setMounted] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Undo / Redo history — each entry is a snapshot of document.cells
  const historyRef = useRef<Array<Record<string, Cell>>>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('SpreadsheetPage useEffect - User:', user?.displayName, 'AppDocument ID:', documentId);

    if (loading) return;

    if (!user) {
      console.log('No user found, redirecting to home');
      router.push('/');
      return;
    }

    const unsubscribeDoc = subscribeToDocument(documentId, (doc: AppDocument | null) => {
      console.log('Document loaded:', doc);
      if (doc) {
        // Evaluate formulas for all cells
        const evaluatedCells = { ...doc.cells };
        Object.keys(evaluatedCells).forEach(cellId => {
          const cell = evaluatedCells[cellId];
          if (cell.formula) {
            cell.computedValue = evaluateFormula(cell.formula, evaluatedCells);
          }
        });

        console.log('AppDocument with evaluated cells:', { ...doc, cells: evaluatedCells });
        setAppDocument({ ...doc, cells: evaluatedCells });
      } else {
        console.log('AppDocument not found, redirecting to home');
        router.push('/');
      }
    });

    const unsubscribePresence = subscribeToPresence(documentId, (presenceList) => {
      console.log('Presence updated:', presenceList);
      setPresences(presenceList);
    });

    // Set up presence for current user
    if (user) {
      const presence: Presence = {
        userId: user.uid,
        userName: user.displayName,
        userColor: user.color,
        lastSeen: new Date(),
      };

      console.log('Setting up presence for user:', presence);
      updatePresence(documentId, presence);

      // Clean up presence on unmount
      return () => {
        console.log('Cleaning up subscriptions and presence');
        unsubscribeDoc();
        unsubscribePresence();
        removePresence(documentId, user.uid);
      };
    }

    return () => {
      console.log('Cleaning up subscriptions');
      unsubscribeDoc();
      unsubscribePresence();
    };
  }, [documentId, user, router, loading]);

  const handleCellUpdate = useCallback(async (cellId: string, cell: Cell) => {
    if (!document || !user) return;

    // Snapshot current state into history before applying the change
    const prevCells = { ...document.cells };
    const hist = historyRef.current.slice(0, historyIndexRef.current + 1);
    hist.push(prevCells);
    // Cap history at 100 entries
    if (hist.length > 100) hist.shift();
    historyRef.current = hist;
    historyIndexRef.current = hist.length - 1;
    syncHistoryState();

    setWriteState({ status: 'saving' });

    try {
      const updatedCells = { ...document.cells, [cellId]: cell };
      const evaluatedCells = { ...updatedCells };
      Object.keys(evaluatedCells).forEach(id => {
        const cellData = evaluatedCells[id];
        if (cellData.formula) {
          cellData.computedValue = evaluateFormula(cellData.formula, evaluatedCells);
        }
      });
      setAppDocument({ ...document, cells: evaluatedCells });
      await updateCell(documentId, cellId, cell);
      setWriteState({ status: 'saved', lastSaved: new Date() });
    } catch (error) {
      console.error('Error updating cell:', error);
      setWriteState({ status: 'saved' });
    }
  }, [document, documentId, user]);

  // Apply a cells snapshot (used by undo/redo)
  const applyCellsSnapshot = useCallback(async (cells: Record<string, Cell>) => {
    if (!document || !user) return;
    setWriteState({ status: 'saving' });
    try {
      const evaluatedCells = { ...cells };
      Object.keys(evaluatedCells).forEach(id => {
        const cellData = evaluatedCells[id];
        if (cellData.formula) cellData.computedValue = evaluateFormula(cellData.formula, evaluatedCells);
      });
      setAppDocument({ ...document, cells: evaluatedCells });
      // Persist every changed cell
      await Promise.all(
        Object.entries(cells).map(([id, c]) => updateCell(documentId, id, c))
      );
      setWriteState({ status: 'saved', lastSaved: new Date() });
    } catch (e) {
      setWriteState({ status: 'saved' });
    }
  }, [document, documentId, user]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    syncHistoryState();
    applyCellsSnapshot(historyRef.current[historyIndexRef.current]);
  }, [applyCellsSnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    syncHistoryState();
    applyCellsSnapshot(historyRef.current[historyIndexRef.current]);
  }, [applyCellsSnapshot]);

  // Ctrl+Z / Ctrl+Y global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);


  const getColumnName = useCallback((index: number): string => {
    let columnName = '';
    while (index >= 0) {
      columnName = String.fromCharCode(65 + (index % 26)) + columnName;
      index = Math.floor(index / 26) - 1;
    }
    return columnName;
  }, []);

  const convertToCSV = useCallback((cells: Record<string, Cell>): string => {
    const maxRow = Math.max(
      ...Object.keys(cells).map(cellId => {
        const match = cellId.match(/[A-Z]+(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
    );

    const maxCol = Math.max(
      ...Object.keys(cells).map(cellId => {
        const match = cellId.match(/([A-Z]+)/);
        if (!match) return 0;

        let col = 0;
        for (let i = 0; i < match[1].length; i++) {
          col = col * 26 + (match[1].charCodeAt(i) - 64);
        }
        return col;
      })
    );

    const rows: string[][] = [];

    for (let row = 1; row <= maxRow; row++) {
      const rowData: string[] = [];
      for (let col = 1; col <= maxCol; col++) {
        const cellId = getColumnName(col - 1) + row;
        const cell = cells[cellId];
        const value = cell?.computedValue || cell?.value || '';
        rowData.push(value.toString());
      }
      rows.push(rowData);
    }

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }, [getColumnName]);

  const handleExport = useCallback(() => {
    if (!document) return;

    const csvContent = convertToCSV(document.cells);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title}.csv`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [document, convertToCSV]);

  if (loading || !document || !user) {
    const statusLabel = loading ? 'Checking Authentication' : (!user ? 'Authentication Required' : 'Initializing Workspace');
    const statusMessage = loading ? 'Verifying your session...' : (!user ? 'Please sign in to access this spreadsheet.' : 'Fetching the latest data for you...');

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl text-center animate-pulse">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-xl font-bold text-slate-900 mb-2">
            {statusLabel}
          </p>
          <p className="text-sm text-slate-500 font-medium">
            {statusMessage}
          </p>
        </div>
      </div>
    );
  }

  const isOwner = user.uid === document.authorId;
  const canEdit = isOwner || document.linkAccess === 'edit';
  const selectedCellValue = selectedCell ? (document.cells[selectedCell]?.formula || document.cells[selectedCell]?.value || '') : '';

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Toolbar
        writeState={writeState}
        selectedCell={selectedCell}
        onExport={handleExport}
        onShare={() => setIsShareOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onBack={() => router.push('/')}
        title={document.title}
        document={document}
        onCellUpdate={handleCellUpdate}
      />

      {/* View-only banner — visible to non-editors */}
      {!canEdit && (
        <div className="flex items-center px-6 py-1.5 bg-amber-50 border-b border-amber-200 space-x-2 text-amber-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className="text-xs font-bold">View Only — You cannot edit this document. Contact the owner for edit access.</span>
        </div>
      )}

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        documentId={documentId}
        documentTitle={document.title}
        presences={presences}
        currentLinkAccess={document.linkAccess}
        isOwner={isOwner}
      />

      {/* Formula Bar */}
      <div className="px-6 py-2 bg-white border-b border-slate-200 flex items-center space-x-4 shadow-sm z-40">
        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-100 rounded-lg">
          <span className="text-xs font-bold text-slate-400 italic">fx</span>
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={selectedCellValue}
            onChange={(e) => {
              if (selectedCell) {
                const cell = document.cells[selectedCell] || { value: '' };
                const newValue = e.target.value;
                const isFormula = newValue.startsWith('=');
                const updatedCell = {
                  ...cell,
                  value: newValue,
                  ...(isFormula ? { formula: newValue } : {}),
                };
                // If it was previously a formula and now isn't, remove formula key
                if (!isFormula && 'formula' in updatedCell) {
                  delete (updatedCell as { formula?: string }).formula;
                }
                handleCellUpdate(selectedCell, updatedCell);
              }
            }}
            placeholder="Select a cell to view or edit its content..."
            readOnly={!canEdit}
            className="w-full px-4 py-1.5 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <SpreadsheetGrid
            document={document}
            onCellUpdate={handleCellUpdate}
            selectedCell={selectedCell}
            setSelectedCell={setSelectedCell}
            readOnly={!canEdit}
          />
        </div>

        <PresenceList presences={presences} currentUser={user} />
      </div>

      {/* Footer Info */}
      <footer className="px-6 py-2 bg-white border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center space-x-4">
          <span>SheetSync Core v2.4.0</span>
          <span className="text-slate-200">|</span>
          <span className="flex items-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
            Real-time Enabled
          </span>
        </div>
        <div>
          {mounted && writeState.lastSaved && `Last saved ${writeState.lastSaved.toLocaleTimeString()}`}
        </div>
      </footer>
    </div>
  );
}

export default function SpreadsheetPage() {
  return (
    <AuthProvider>
      <SpreadsheetPageContent />
    </AuthProvider>
  );
}
