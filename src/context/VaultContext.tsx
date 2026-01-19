'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Vault } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface VaultContextType {
  vault: Vault | null;
  masterPassword: string | null;
  isLocked: boolean;
  setUnlockedVault: (vault: Vault, password: string) => void;
  setVault: (vault: Vault) => void;
  lockVault: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vault, setVaultInternal] = useState<Vault | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const router = useRouter();

  const isLocked = vault === null || masterPassword === null;

  const lockVault = () => {
    setVaultInternal(null);
    setMasterPassword(null);
    // Clear sensitive data from memory
    console.log('Vault locked.');
    router.push('/unlock');
  };

  const setUnlockedVault = (newVault: Vault, password: string) => {
    setVaultInternal(newVault);
    setMasterPassword(password);
  };
  
  const setVault = (newVault: Vault) => {
    setVaultInternal(newVault);
  }

  const value = {
    vault,
    masterPassword,
    isLocked,
    setUnlockedVault,
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
