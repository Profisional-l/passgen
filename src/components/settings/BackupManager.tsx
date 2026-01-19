'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useVault } from '@/context/VaultContext';
import { decryptVault, encryptVault } from '@/lib/crypto';
import type { EncryptedVault, Vault } from '@/lib/types';
import { Download, Upload, Loader2 } from 'lucide-react';
import { persistEncryptedVault } from '@/lib/storage';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function BackupManager() {
  const { toast } = useToast();
  const { vault, setUnlockedVault, masterPassword, login, kdfParams, kdfSalt } = useVault();
  const [isImporting, setIsImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<EncryptedVault | null>(null);
  const [pendingBackupLogin, setPendingBackupLogin] = useState<string>('');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [isFinalizingImport, setIsFinalizingImport] = useState(false);

  const handleExport = async () => {
    if (!vault || !masterPassword || !login || !kdfParams || !kdfSalt) {
      toast({ variant: 'destructive', title: 'Error', description: 'Vault is not loaded.' });
      return;
    }
    
    const password = masterPassword;

    try {
        const encrypted = await encryptVault(vault, password, { kdf_params: kdfParams, kdf_salt: kdfSalt });
        const backupData = { format: 1, login, ...encrypted };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crypt-keeper-backup-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast({ title: 'Export Successful', description: 'Your encrypted vault backup has been downloaded.' });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'An error occurred during export.' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
        const content = await file.text();
        const parsed = JSON.parse(content);
        if (parsed.format !== 1) {
          throw new Error('Unsupported backup format');
        }
        const backupData: EncryptedVault = parsed;
        
        if (!backupData.vault_ciphertext || !backupData.vault_nonce || !backupData.kdf_salt || !backupData.kdf_params || backupData.vault_version === undefined) {
            throw new Error("Invalid backup file format.");
        }
        setPendingBackup(backupData);
        setPendingBackupLogin((parsed.login ?? login ?? '').toLowerCase());
        setImportPassword('');
        setIsPasswordDialogOpen(true);

    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
    } finally {
        setIsImporting(false);
        // Reset file input
        event.target.value = '';
    }
  };

  const finalizeImport = async () => {
    if (!pendingBackup) return;
    const importLogin = pendingBackupLogin.trim();
    if (!importLogin) {
      toast({ variant: 'destructive', title: 'Import Failed', description: 'Login is missing. Please unlock or include login in backup.' });
      return;
    }
    if (!importPassword) {
      toast({ variant: 'destructive', title: 'Import Failed', description: 'Master password is required.' });
      return;
    }

    setIsFinalizingImport(true);
    try {
      const decryptedVault = await decryptVault(pendingBackup, importPassword);

      const encrypted = await encryptVault(decryptedVault, importPassword, {
        kdf_params: pendingBackup.kdf_params,
        kdf_salt: pendingBackup.kdf_salt,
      });

      // Try to sync to server; if offline/unavailable, still persist locally
      try {
        const response = await fetch('/api/vault', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: importLogin, ...encrypted }),
        });
        if (!response.ok) {
          throw new Error('Server rejected update');
        }
      } catch (networkError) {
        toast({
          title: 'Imported Locally',
          description: 'Server unreachable. Vault restored locally; sync when online.',
        });
      }

      await persistEncryptedVault(importLogin, encrypted);
      const fullVault: Vault = { ...decryptedVault, vault_version: encrypted.vault_version };
      setUnlockedVault(fullVault, importPassword, importLogin, { salt: encrypted.kdf_salt, params: encrypted.kdf_params });

      toast({ title: 'Import Successful', description: 'Vault has been restored from backup.' });
      setIsPasswordDialogOpen(false);
      setPendingBackup(null);
      setPendingBackupLogin('');
      setImportPassword('');
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: err instanceof Error ? err.message : 'An unknown error occurred.',
      });
    } finally {
      setIsFinalizingImport(false);
    }
  };

  return (
    <>
      <div className="grid md:grid-cols-2 gap-8">
      <Card className="bg-card/50 backdrop-blur-lg border border-border/30">
        <CardHeader>
          <CardTitle className="font-headline">Export Vault</CardTitle>
          <CardDescription>
            Download a local, encrypted backup of your vault. Keep this file safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={!vault}>
            <Download className="mr-2 h-4 w-4" /> Export Encrypted Backup
          </Button>
        </CardContent>
      </Card>
      
      <Card className="bg-card/50 backdrop-blur-lg border border-border/30">
        <CardHeader>
          <CardTitle className="font-headline">Import Vault</CardTitle>
          <CardDescription>
            Restore your vault from an encrypted backup file. This will overwrite your current vault.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4">
                <Button asChild variant="outline">
                    <label htmlFor="import-file" className="cursor-pointer">
                        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Choose Backup File...
                    </label>
                </Button>
                <Input id="import-file" type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>
        </CardContent>
      </Card>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={open => {
        setIsPasswordDialogOpen(open);
        if (!open) {
          setPendingBackup(null);
          setPendingBackupLogin('');
          setImportPassword('');
        }
      }}>
        <DialogContent className="sm:max-w-[450px] bg-background/80 backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">Enter Master Password</DialogTitle>
            <DialogDescription>
              To restore this encrypted backup, enter the master password used to create it. It is never sent to the server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Login</Label>
              <Input value={pendingBackupLogin} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-master-password">Master Password</Label>
              <Input
                id="import-master-password"
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              disabled={isFinalizingImport}
            >
              Cancel
            </Button>
            <Button onClick={finalizeImport} disabled={isFinalizingImport}>
              {isFinalizingImport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
