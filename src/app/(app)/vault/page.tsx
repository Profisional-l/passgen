'use client';

import { useVault } from '@/context/VaultContext';
import VaultList from '@/components/vault/VaultList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import AddEditItemDialog from '@/components/vault/AddEditItemDialog';

export default function VaultPage() {
  const { vault } = useVault();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline">My Vault</h1>
          <p className="text-muted-foreground">
            You have {vault?.entries.length ?? 0} item(s) saved.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <VaultList />

      <AddEditItemDialog
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
      />
    </div>
  );
}
