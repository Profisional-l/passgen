"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import type { Vault } from "@/lib/types";
import type { KDFParams } from "@/lib/types";
import { decryptVault } from "@/lib/crypto";
import useAutoLock from "@/hooks/useAutoLock";
import { useRouter } from "next/navigation";

interface VaultContextType {
  vault: Vault | null;
  masterPassword: string | null;
  login: string | null;
  kdfSalt: string | null;
  kdfParams: KDFParams | null;
  isLocked: boolean;
  needsSync: boolean;
  lastSyncAt: number | null;
  serverVersion: number | null;
  setUnlockedVault: (
    vault: Vault,
    password: string,
    login: string,
    kdf: { salt: string; params: KDFParams },
  ) => void;
  setVault: (vault: Vault) => void;
  lockVault: () => void;
  checkForUpdates: () => Promise<void>;
  refreshVaultFromServer: () => Promise<void>;
  clearSyncFlag: () => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vault, setVaultInternal] = useState<Vault | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  const [kdfSalt, setKdfSalt] = useState<string | null>(null);
  const [kdfParams, setKdfParams] = useState<KDFParams | null>(null);
  const [needsSync, setNeedsSync] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [serverVersion, setServerVersion] = useState<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const isLocked = vault === null || masterPassword === null;

  useAutoLock(3 * 60 * 1000, () => {
    if (!isLocked) {
      lockVault();
    }
  });

  // Background sync polling
  useEffect(() => {
    if (isLocked || !login) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const checkUpdates = async () => {
      try {
        const response = await fetch(
          `/api/vault/version?login=${encodeURIComponent(login)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setServerVersion(data.vault_version);

          if (data.vault_version > (vault?.vault_version ?? 0)) {
            setNeedsSync(true);
          }
        }
      } catch (e) {
        console.debug("Vault version check failed (offline)", e);
      }
    };

    checkUpdates();
    pollIntervalRef.current = setInterval(checkUpdates, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isLocked, login, vault?.vault_version]);

  const lockVault = () => {
    setVaultInternal(null);
    setMasterPassword(null);
    setLogin(null);
    setKdfSalt(null);
    setKdfParams(null);
    setNeedsSync(false);
    console.log("Vault locked.");
    router.push("/unlock");
  };

  const setUnlockedVault = (
    newVault: Vault,
    password: string,
    userLogin: string,
    kdf: { salt: string; params: KDFParams },
  ) => {
    setVaultInternal(newVault);
    setMasterPassword(password);
    setLogin(userLogin);
    setKdfSalt(kdf.salt);
    setKdfParams(kdf.params);
    setNeedsSync(false);
  };

  const setVault = (newVault: Vault) => {
    setVaultInternal(newVault);
    setLastSyncAt(Date.now());
    setNeedsSync(false);
  };

  const checkForUpdates = async () => {
    if (!login) return;
    try {
      const response = await fetch(
        `/api/vault/version?login=${encodeURIComponent(login)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setServerVersion(data.vault_version);
        if (data.vault_version > (vault?.vault_version ?? 0)) {
          setNeedsSync(true);
        }
      }
    } catch (e) {
      console.error("Failed to check vault updates", e);
    }
  };

  const refreshVaultFromServer = async () => {
    if (!login || !masterPassword) return;

    try {
      const response = await fetch(
        `/api/vault?login=${encodeURIComponent(login)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch vault");

      const serverData = await response.json();
      const freshVault = await decryptVault(
        {
          vault_ciphertext: serverData.vault_ciphertext,
          vault_nonce: serverData.vault_nonce,
          kdf_salt: serverData.kdf_salt,
          kdf_params: serverData.kdf_params,
          vault_version: serverData.vault_version,
        },
        masterPassword,
      );

      setVault(freshVault);
    } catch (e) {
      console.error("Failed to refresh vault", e);
    }
  };

  const clearSyncFlag = () => {
    setNeedsSync(false);
  };

  const value: VaultContextType = {
    vault,
    masterPassword,
    login,
    kdfSalt,
    kdfParams,
    isLocked,
    needsSync,
    lastSyncAt,
    serverVersion,
    setUnlockedVault,
    setVault,
    lockVault,
    checkForUpdates,
    refreshVaultFromServer,
    clearSyncFlag,
  };

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
