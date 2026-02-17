import type { Vault, VaultEntry } from './types';

/**
 * Intelligently merge two vault versions
 * Resolves conflicts by taking the newer entry and combining unique entries
 */
export function mergeVaults(localVault: Vault, serverVault: Vault): Vault {
  const localEntryIds = new Set(localVault.entries.map(e => e.id));
  const serverEntryIds = new Set(serverVault.entries.map(e => e.id));

  // Entries only on server → add them
  const newFromServer = serverVault.entries.filter(e => !localEntryIds.has(e.id));

  // Entries only locally → keep them
  const localOnly = localVault.entries.filter(e => !serverEntryIds.has(e.id));

  // Common entries → take the newer one
  const mergedCommon = localVault.entries
    .filter(e => serverEntryIds.has(e.id))
    .map(localEntry => {
      const serverEntry = serverVault.entries.find(se => se.id === localEntry.id);
      if (!serverEntry) return localEntry;

      // Compare by updatedAt timestamp
      const localTime = new Date(localEntry.updatedAt).getTime();
      const serverTime = new Date(serverEntry.updatedAt).getTime();

      return serverTime > localTime ? serverEntry : localEntry;
    });

  // Combine all entries
  const mergedEntries: VaultEntry[] = [...mergedCommon, ...newFromServer, ...localOnly];

  // Sort by updatedAt for consistency
  mergedEntries.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    ...localVault,
    entries: mergedEntries,
    vault_version: Math.max(localVault.vault_version, serverVault.vault_version) + 1,
  };
}

/**
 * Calculate a simple hash of vault content for quick comparison
 */
export function getVaultHash(vault: Vault): string {
  const content = JSON.stringify({
    entryIds: vault.entries.map(e => e.id).sort(),
    entryHashes: vault.entries
      .map(e => ({
        id: e.id,
        updatedAt: e.updatedAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });

  // Simple hash - in production use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
