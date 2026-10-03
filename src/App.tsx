import React, { useState, useEffect } from 'react';
import { HostDashboard } from './components/HostDashboard';
import { PhoneController } from './components/PhoneController';

export default function App() {
  const [currentMode, setCurrentMode] = useState<'host' | 'controller'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'controller') return 'controller';
      if (mode === 'host') return 'host';

      // Auto-detect mobile screen width or touch device
      if (window.innerWidth <= 640 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        return 'controller';
      }
    }
    return 'host';
  });

  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room')?.toUpperCase() || 'BUZZ1';
    }
    return 'BUZZ1';
  });

  const [initialSlot] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const slot = Number(params.get('player') || params.get('slot'));
      if (slot >= 1 && slot <= 8) return slot;
    }
    return 1;
  });

  // Listen for browser navigation / popstate
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'controller') setCurrentMode('controller');
      else if (mode === 'host') setCurrentMode('host');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSwitchMode = (newMode: 'host' | 'controller') => {
    setCurrentMode(newMode);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    window.history.pushState({}, '', url.toString());
  };

  // If in Phone Controller mode, render pure uninterrupted controller with no host controls
  if (currentMode === 'controller') {
    return (
      <div className="h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
        <PhoneController initialRoomId={roomId} initialSlot={initialSlot} />
      </div>
    );
  }

  // Otherwise in Host Dashboard mode
  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      <HostDashboard
        roomId={roomId}
        onSwitchToController={() => handleSwitchMode('controller')}
      />
    </div>
  );
}
