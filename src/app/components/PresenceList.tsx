'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Presence } from '../firebase/types';

interface PresenceListProps {
  presences: Presence[];
}

export const PresenceList: React.FC<PresenceListProps> = ({ presences }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000); // Update every 10s
    return () => clearInterval(timer);
  }, []);

  const activePresences = useMemo(() => presences.filter(
    presence => now - presence.lastSeen.getTime() < 30000 // Active within last 30 seconds
  ), [presences, now]);

  return (
    <div className="glass border-l border-slate-200/50 w-72 h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Collaborators</h3>
        <span className="bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {activePresences.length} Live
        </span>
      </div>
      
      {activePresences.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
            </svg>
          </div>
          <p className="text-sm text-slate-400 font-medium">Just you in here...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
          {activePresences.map((presence) => (
            <div key={presence.userId} className="group flex items-center p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: presence.userColor }}
                >
                  {presence.userName?.[0] || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="ml-3 flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-700 truncate">{presence.userName}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tighter">Editing</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 pt-6 border-t border-slate-200/50">
        <div className="p-4 bg-indigo-50 rounded-2xl">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">PRO TIP</p>
          <p className="text-xs text-indigo-700 font-medium leading-relaxed">
            Changes are shared instantly with everyone in the workspace.
          </p>
        </div>
      </div>
    </div>
  );
};
