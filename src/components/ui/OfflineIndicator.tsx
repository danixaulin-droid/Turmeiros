"use client";

import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-red-600 text-white text-xs font-bold py-1 px-4 text-center fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="w-3 h-3" />
      <span>VOCÊ ESTÁ OFFLINE - MODO SEM INTERNET ATIVO</span>
    </div>
  );
}