'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { subscribeToDocument, updateCell, updatePresence, removePresence, subscribeToPresence } from '../../firebase/firestore';
import { Document as AppDocument, Cell, Presence, WriteState } from '../../firebase/types';
import { SpreadsheetGrid } from '../../components/SpreadsheetGrid';
import { Toolbar } from '../../components/Toolbar';
import { PresenceList } from '../../components/PresenceList';
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

    setWriteState({ status: 'saving' });

    try {
      // Update local state immediately for responsiveness
      const updatedCells = { ...document.cells, [cellId]: cell };
      
      // Evaluate formulas for all cells
      const evaluatedCells = { ...updatedCells };
      Object.keys(evaluatedCells).forEach(id => {
        const cellData = evaluatedCells[id];
        if (cellData.formula) {
          cellData.computedValue = evaluateFormula(cellData.formula, evaluatedCells);
        }
      });

      setAppDocument({ ...document, cells: evaluatedCells });
      
      // Update in Firestore
      await updateCell(documentId, cellId, cell);
      
      setWriteState({ status: 'saved', lastSaved: new Date() });
    } catch (error) {
      console.error('Error updating cell:', error);
      setWriteState({ status: 'saved' }); // Reset status on error
    }
  }, [document, documentId, user]);


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

  const selectedCellValue = selectedCell ? (document.cells[selectedCell]?.formula || document.cells[selectedCell]?.value || '') : '';

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Toolbar
        writeState={writeState}
        selectedCell={selectedCell}
        onExport={handleExport}
        title={document.title}
        document={document}
        onCellUpdate={handleCellUpdate}
      />
      
      {/* Formula Bar */}
      <div className="px-6 py-2 bg-white border-b border-slate-200 flex items-center space-x-4 shadow-sm z-40">
        <div className="flex items-center space-x-2 px-3 py-1 bg-slate-100 rounded-lg">
          <span className="text-xs font-bold text-slate-400 italic">fx</span>
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            readOnly
            value={selectedCellValue}
            placeholder="Select a cell to view or edit its content..."
            className="w-full px-4 py-1.5 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 focus:outline-none"
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
          />
        </div>
        
        <div className="h-full">
          <PresenceList presences={presences} />
        </div>
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
