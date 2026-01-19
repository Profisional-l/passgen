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

export default function BackupManager() {
  const { toast } = useToast();
  const { vault, setVault } = useVault();
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    if (!vault) {
      toast({ variant: 'destructive', title: 'Error', description: 'Vault is not loaded.' });
      return;
    }
    
    const password = prompt("Для экспорта вашего хранилища, пожалуйста, введите ваш мастер-пароль.");
    if (!password) {
        toast({ variant: 'destructive', title: 'Экспорт отменен', description: 'Мастер-пароль не предоставлен.' });
        return;
    }

    try {
        const { encrypted, salt, params } = await encryptVault(vault, password);
        const backupData: EncryptedVault = { ...encrypted, salt, params, version: vault.version };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crypt-keeper-backup-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast({ title: 'Export Successful', description: 'Your encrypted vault backup has been downloaded.' });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Incorrect master password or another error occurred.' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
        const content = await file.text();
        const backupData: EncryptedVault = JSON.parse(content);
        
        if (!backupData.ciphertext || !backupData.nonce || !backupData.salt || !backupData.params || backupData.version === undefined) {
            throw new Error("Invalid backup file format.");
        }

        const password = prompt("Для импорта резервной копии, пожалуйста, введите соответствующий мастер-пароль.");
        if (!password) {
            toast({ variant: 'destructive', title: 'Импорт отменен', description: 'Мастер-пароль не предоставлен.' });
            return;
        }

        const decryptedVault = await decryptVault(backupData.ciphertext, backupData.nonce, backupData.salt, backupData.params, password);
        
        // At this point, we have the decrypted new vault.
        // We should now encrypt it again and PUT it to the server.
        const { encrypted, salt, params } = await encryptVault(decryptedVault, password);
        
        const response = await fetch('/api/vault', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...encrypted, salt, params, version: backupData.version }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to update server with imported vault. If this is a new device, this might be expected. Try unlocking again.");
        }
        
        const responseData = await response.json();
        
        const fullVault: Vault = { ...decryptedVault, version: responseData.version };

        setVault(fullVault);
        toast({ title: 'Import Successful', description: 'Vault has been restored from backup.' });

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

  return (
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
  );
}
