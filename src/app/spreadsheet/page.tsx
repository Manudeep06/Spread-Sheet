'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { getDocuments } from '../firebase/firestore';
import { Document } from '../firebase/types';

function SpreadsheetIndexContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments(user?.uid);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, loadDocuments]);

  const handleOpenDocument = (docId: string) => {
    router.push(`/spreadsheet/${docId}`);
  };

  const handleCreateNew = () => {
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl text-center animate-fade-in">
          <h1 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">Access Denied</h1>
          <p className="text-slate-500 mb-8 font-medium">Please sign in to view your workspaces.</p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary w-full"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="glass sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">SheetSync</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16 animate-fade-in">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Workspace Hub</h1>
            <p className="text-slate-500 text-lg">Select a spreadsheet to start collaborating.</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="btn-primary px-8"
          >
            Create New
          </button>
        </header>
        
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden overflow-x-auto">
          {documents.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-400 font-medium">No spreadsheets found yet.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Shared</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Author</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                    onClick={() => handleOpenDocument(doc.id)}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-lg font-bold text-slate-800">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-slate-500">
                        {doc.updatedAt.toLocaleDateString()} at {doc.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200"></div>
                        <span className="text-sm font-bold text-slate-600">{doc.authorName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center">
                        Open Workspace
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SpreadsheetIndex() {
  return (
    <AuthProvider>
      <SpreadsheetIndexContent />
    </AuthProvider>
  );
}
