'use client';

import { useState } from 'react';
import type { VaultItem as VaultItemType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Copy, Eye, EyeOff, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddEditItemDialog from './AddEditItemDialog';
import { useVault } from '@/context/VaultContext';
import { encryptVault } from '@/lib/crypto';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function VaultItem({ item }: { item: VaultItemType }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { vault, setVault } = useVault();

  const handleCopy = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: `${fieldName} copied to clipboard` });
  };
  
  const handleDelete = async () => {
    if (!vault) return;
    
    // This part requires re-prompting for password to re-encrypt
    const password = prompt("To confirm deletion, please enter your master password.");
    if (!password) {
        toast({ variant: 'destructive', title: 'Deletion cancelled', description: 'Master password not provided.' });
        return;
    }

    try {
        const updatedItems = vault.items.filter(i => i.id !== item.id);
        const updatedVault = { ...vault, items: updatedItems };

        const { encrypted, salt, params } = await encryptVault(updatedVault, password);
        const response = await fetch('/api/vault', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...encrypted, salt, params, version: vault.version }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 409) {
            toast({ variant: 'destructive', title: 'Conflict Detected', description: "Your vault is out of sync. Please unlock it again to get the latest version before making changes." });
          } else {
            throw new Error(errorData.error || 'Failed to delete item.');
          }
          return;
        }
        
        const responseData = await response.json();
        setVault({ ...updatedVault, version: responseData.version });
        toast({ title: 'Item Deleted', description: `"${item.name}" has been removed from your vault.` });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: e instanceof Error ? e.message : 'An unknown error occurred.' });
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-lg border border-border/30 flex flex-col">
        <CardHeader className="flex-row items-start gap-4">
          <div className="flex-grow">
            <CardTitle className="font-headline">{item.name}</CardTitle>
            <CardDescription>{item.username}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <AlertDialog onOpenChange={setIsDeleting} open={isDeleting}>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> 
                      <span className="text-destructive">Delete</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{item.name}". This action requires your master password to confirm and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4 flex-grow">
          <div className="flex items-center gap-2">
            <p className="flex-grow font-mono text-sm">
              {showPassword ? item.password : '••••••••••••••••'}
            </p>
            <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleCopy(item.password, 'Password')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
           <div className="flex items-center gap-2">
            <p className="flex-grow text-sm text-muted-foreground truncate">
              {item.url}
            </p>
            <Button variant="ghost" size="icon" onClick={() => handleCopy(item.url, 'URL')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEditing && (
        <AddEditItemDialog
          itemToEdit={item}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
        />
      )}
    </>
  );
}
