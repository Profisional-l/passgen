'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Vault } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface VaultContextType {
  vault: Vault | null;
  isLocked: boolean;
  setVault: (vault: Vault | null) => void;
  lockVault: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vault, setVault] = useState<Vault | null>(null);
  const router = useRouter();

  const isLocked = vault === null;

  const lockVault = () => {
    setVault(null);
    // Clear sensitive data from memory
    console.log('Vault locked.');
    router.push('/unlock');
  };

  const value = {
    vault,
    isLocked,
    setVault,
    lockVault,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
