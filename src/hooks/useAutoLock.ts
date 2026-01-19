'use client';

import { useEffect, useCallback, useRef } from 'react';

const useAutoLock = (timeout: number, onIdle: () => void) => {
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
  }, [resetTimer]);

  return;
};

export default useAutoLock;
