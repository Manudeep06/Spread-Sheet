'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getDocuments, createDocument } from '../firebase/firestore';
import { Document } from '../firebase/types';

export const Dashboard: React.FC = () => {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [authInProgress, setAuthInProgress] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  const handleSignIn = async () => {
    setAuthInProgress(true);
    try {
      await signIn();
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      
      // Offer fallback authentication
      if (error instanceof Error && error.message?.includes('Network connection failed')) {
        const useFallback = confirm('Network authentication failed. Use demo mode to test the spreadsheet?');
        if (useFallback) {
          const { signInAnonymously } = await import('../firebase/simple-auth');
          await signInAnonymously();
          // Force reload to update auth state
          window.location.reload();
        }
      }
    } finally {
      setTimeout(() => setAuthInProgress(false), 2000);
    }
  };

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments(user?.uid);
      setDocuments(docs);
      
      // Auto-redirect to most recent document if there's only one
      if (docs.length === 1 && docs[0]) {
        router.push(`/spreadsheet/${docs[0].id}`);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setDocsLoading(false);
    }
  }, [user?.uid, router]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, loadDocuments]);

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim() || !user) return;
    
    setCreating(true);
    try {
      const docId = await createDocument(newDocTitle, user.uid, user.displayName);
      setNewDocTitle('');
      await loadDocuments();
      router.push(`/spreadsheet/${docId}`);
    } catch (error) {
      console.error('Error creating document:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDocument = (docId: string) => {
    router.push(`/spreadsheet/${docId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl text-center animate-pulse">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-xl font-bold text-slate-900 mb-2">Verifying Session</p>
          <p className="text-sm text-slate-500 font-medium">Please wait while we check your credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass p-10 rounded-3xl shadow-2xl text-center animate-fade-in">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-200">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">SheetSync</h1>
          <p className="text-slate-500 mb-10 text-lg leading-relaxed">The ultimate collaborative spreadsheet experience. Simple, fast, and professional.</p>
          <button
            onClick={handleSignIn}
            disabled={authInProgress}
            className="btn-primary w-full flex items-center justify-center space-x-3 text-lg py-4"
          >
            {authInProgress ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Redirecting...
              </span>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="glass sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">SheetSync</span>
          </div>
          <div className="flex items-center space-x-4 bg-white/50 p-1 pr-4 rounded-full border border-slate-200">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden" style={{ backgroundColor: user.color }}>
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {user.displayName?.[0] || 'U'}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-700 leading-none">{user.displayName}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Pro Account</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 animate-fade-in">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-2">My Workspaces</h2>
            <p className="text-slate-500 text-lg">Manage and collaborate on your spreadsheets in real-time.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 min-w-[300px] md:min-w-[450px]">
            <div className="relative flex-1">
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="New Spreadsheet Title..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
              />
              <svg className="w-6 h-6 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <button
              onClick={handleCreateDocument}
              disabled={creating || !newDocTitle.trim()}
              className="btn-primary disabled:opacity-50 disabled:transform-none whitespace-nowrap px-8"
            >
              {creating ? 'Creating...' : 'Create New'}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {docsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-3xl bg-white border border-slate-100 shadow-sm animate-pulse"></div>
            ))
          ) : documents.length === 0 ? (
            <div className="col-span-full py-20 text-center glass rounded-3xl border-dashed border-2 border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No spreadsheets yet</h3>
              <p className="text-slate-500">Create your first workspace to get started!</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="card-premium group p-8 cursor-pointer flex flex-col h-64 justify-between"
                onClick={() => handleOpenDocument(doc.id)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                      Live
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{doc.title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-1">Created by {doc.authorName}</p>
                </div>
                
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {mounted ? `Edited ${doc.updatedAt.toLocaleDateString()}` : 'Loading date...'}
                  </span>
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      +3
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
};
