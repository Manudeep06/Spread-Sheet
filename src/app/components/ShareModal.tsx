'use client';

import React, { useState, useEffect } from 'react';
import { Presence } from '../firebase/types';
import { updateLinkAccess } from '../firebase/firestore';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    documentTitle: string;
    presences: Presence[];
    currentLinkAccess: 'edit' | 'view';
    isOwner: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentTitle,
    presences,
    currentLinkAccess,
    isOwner,
}) => {
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [linkAccess, setLinkAccess] = useState<'edit' | 'view'>(currentLinkAccess);
    const [savingAccess, setSavingAccess] = useState(false);

    useEffect(() => {
        setLinkAccess(currentLinkAccess);
    }, [currentLinkAccess]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShareUrl(`${window.location.origin}/spreadsheet/${documentId}`);
        }
    }, [documentId]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleAccessChange = async (newAccess: 'edit' | 'view') => {
        if (!isOwner || newAccess === linkAccess) return;
        setSavingAccess(true);
        try {
            await updateLinkAccess(documentId, newAccess);
            setLinkAccess(newAccess);
        } finally {
            setSavingAccess(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Share "{documentTitle}"</h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    {isOwner ? 'Control link access and invite collaborators' : 'Share this document'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">

                    {/* Access Control — owner only */}
                    {isOwner && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Link Permissions
                                {savingAccess && (
                                    <span className="ml-2 text-amber-500 normal-case font-medium">Saving...</span>
                                )}
                            </label>
                            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 gap-1">
                                <button
                                    onClick={() => handleAccessChange('edit')}
                                    className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${linkAccess === 'edit'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                    <span>Can Edit</span>
                                </button>
                                <button
                                    onClick={() => handleAccessChange('view')}
                                    className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-bold transition-all ${linkAccess === 'view'
                                            ? 'bg-white text-slate-700 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                    </svg>
                                    <span>View Only</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-1.5">
                                {linkAccess === 'edit'
                                    ? 'Anyone with this link can view and edit the document'
                                    : 'Anyone with this link can only view — they cannot make changes'}
                            </p>
                        </div>
                    )}

                    {/* Non-owner info pill */}
                    {!isOwner && (
                        <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-sm font-semibold ${linkAccess === 'edit'
                                ? 'bg-green-50 border-green-100 text-green-700'
                                : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                            {linkAccess === 'edit'
                                ? <><svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg><span>You have editing access</span></>
                                : <><svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg><span>View only — contact the owner for edit access</span></>
                            }
                        </div>
                    )}

                    {/* Link Copy */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Document Link
                        </label>
                        <div className="flex items-center space-x-2">
                            <div className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-600 truncate">
                                {shareUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${copied
                                        ? 'bg-green-500 text-white shadow-sm shadow-green-200'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Active Collaborators */}
                    {presences.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Currently Online ({presences.length})
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {presences.map((p) => (
                                    <div key={p.userId} className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                                            style={{ backgroundColor: p.userColor || '#6366f1' }}
                                        >
                                            {p.userName?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{p.userName}</p>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Live</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.99]"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
