'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Presence, User } from '../firebase/types';

interface PresenceListProps {
  presences: Presence[];
  currentUser: User;
}

export const PresenceList: React.FC<PresenceListProps> = ({ presences, currentUser }) => {
  const [now, setNow] = useState(() => Date.now());
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activePresences = useMemo(() =>
    presences.filter(p => now - p.lastSeen.getTime() < 30000),
    [presences, now]
  );

  // Build full user list: current user (always first) + other active users (deduped)
  const allUsers = useMemo(() => {
    const selfAsPresence: Presence = {
      userId: currentUser.uid,
      userName: currentUser.displayName,
      userColor: currentUser.color,
      lastSeen: new Date(),
    };
    const others = activePresences.filter(p => p.userId !== currentUser.uid);
    return [selfAsPresence, ...others];
  }, [activePresences, currentUser]);

  const totalOnline = allUsers.length;

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-2">

      {/* Expanded Panel */}
      {isOpen && !isMinimized && (
        <div className="w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                Online
              </h3>
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                <span>{totalOnline} Live</span>
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {/* Minimize */}
              <button
                onClick={() => setIsMinimized(true)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                title="Minimize"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                title="Close"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {allUsers.map((user, idx) => {
              const isSelf = user.userId === currentUser.uid;
              return (
                <div
                  key={user.userId}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl border transition-all ${isSelf
                      ? 'bg-indigo-50 border-indigo-100'
                      : 'bg-slate-50 border-slate-100'
                    }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: user.userColor || '#6366f1' }}
                    >
                      {user.userName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isSelf ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {user.userName}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-tighter text-slate-400">
                      {isSelf ? 'You' : idx === 1 && allUsers.length > 1 ? 'Collaborator' : 'Collaborator'}
                    </p>
                  </div>

                  {/* Live badge */}
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Live
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer tip */}
          <div className="px-4 pb-4 pt-1">
            <div className="bg-indigo-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Pro Tip</p>
              <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                Changes sync in real-time for all collaborators.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Minimized bar */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all animate-in fade-in duration-200"
        >
          <div className="flex -space-x-1.5">
            {allUsers.slice(0, 3).map(u => (
              <div
                key={u.userId}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: u.userColor || '#6366f1' }}
              >
                {u.userName?.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-700">{totalOnline} online</span>
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => { setIsOpen(o => !o); setIsMinimized(false); }}
        className="relative flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 py-3 shadow-lg shadow-indigo-300 hover:shadow-xl transition-all active:scale-95"
        title="Online collaborators"
      >
        {/* Stacked avatars */}
        <div className="flex -space-x-2">
          {allUsers.slice(0, 3).map(u => (
            <div
              key={u.userId}
              className="w-7 h-7 rounded-full border-2 border-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm"
              style={{ backgroundColor: u.userColor || '#818cf8' }}
            >
              {u.userName?.charAt(0).toUpperCase()}
            </div>
          ))}
          {allUsers.length > 3 && (
            <div className="w-7 h-7 rounded-full border-2 border-indigo-600 bg-indigo-800 flex items-center justify-center text-white text-[10px] font-bold">
              +{allUsers.length - 3}
            </div>
          )}
        </div>
        <span className="text-sm font-bold">{totalOnline}</span>

        {/* Live pulse indicator */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
      </button>
    </div>
  );
};
