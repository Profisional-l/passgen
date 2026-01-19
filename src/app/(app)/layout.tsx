'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVault } from '@/context/VaultContext';
import useAutoLock from '@/hooks/useAutoLock';
import Header from '@/components/layout/Header';
import AppContainer from '@/components/layout/AppContainer';
import { Loader2 } from 'lucide-react';

const AUTO_LOCK_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLocked, lockVault } = useVault();
  const router = useRouter();
  
  // Custom hook for auto-locking after inactivity
  useAutoLock(AUTO_LOCK_TIMEOUT, lockVault);

  useEffect(() => {
    if (isLocked) {
      router.replace('/unlock');
    }
  }, [isLocked, router]);

  if (isLocked) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Securing your session...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow py-8">
        <AppContainer>
          {children}
        </AppContainer>
      </main>
    </div>
  );
}
