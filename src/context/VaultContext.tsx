'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Vault } from '@/lib/types';
import type { KDFParams } from '@/lib/types';
import useAutoLock from '@/hooks/useAutoLock';
import { useRouter } from 'next/navigation';

interface VaultContextType {
  vault: Vault | null;
  masterPassword: string | null;
  login: string | null;
  kdfSalt: string | null;
  kdfParams: KDFParams | null;
  isLocked: boolean;
  setUnlockedVault: (vault: Vault, password: string, login: string, kdf: { salt: string; params: KDFParams }) => void;
  setVault: (vault: Vault) => void;
  lockVault: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vault, setVaultInternal] = useState<Vault | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  const [kdfSalt, setKdfSalt] = useState<string | null>(null);
  const [kdfParams, setKdfParams] = useState<KDFParams | null>(null);
  const router = useRouter();

  const isLocked = vault === null || masterPassword === null;

  useAutoLock(3 * 60 * 1000, () => {
    if (!isLocked) {
      lockVault();
    }
  });

  const lockVault = () => {
    setVaultInternal(null);
    setMasterPassword(null);
    setLogin(null);
    setKdfSalt(null);
    setKdfParams(null);
    // Clear sensitive data from memory
    console.log('Vault locked.');
    router.push('/unlock');
  };

  const setUnlockedVault = (newVault: Vault, password: string, userLogin: string, kdf: { salt: string; params: KDFParams }) => {
    setVaultInternal(newVault);
    setMasterPassword(password);
    setLogin(userLogin);
    setKdfSalt(kdf.salt);
    setKdfParams(kdf.params);
  };
  
  const setVault = (newVault: Vault) => {
    setVaultInternal(newVault);
  }

  const value = {
    vault,
    masterPassword,
    login,
    kdfSalt,
    kdfParams,
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
