'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const useAutoLock = (timeout: number, onIdle: () => void) => {
  const router = useRouter();
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(onIdle, timeout);
  }, [onIdle, timeout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Set up event listeners
    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Initial timer start
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [resetTimer, router]);

  return;
};

export default useAutoLock;
