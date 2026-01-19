'use client';

import { useVault } from '@/context/VaultContext';
import VaultItem from './VaultItem';
import { Card, CardContent } from '../ui/card';
import { KeyRound } from 'lucide-react';

export default function VaultList() {
  const { vault } = useVault();

  if (!vault || vault.items.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="p-12 text-center">
            <KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium font-headline">Your vault is empty</h3>
            <p className="mt-1 text-sm text-muted-foreground">Click "Add Item" to save your first password.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vault.items.map(item => (
        <VaultItem key={item.id} item={item} />
      ))}
    </div>
  );
}
