'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useVault } from '@/context/VaultContext';
import { encryptVault } from '@/lib/crypto';
import type { VaultItem } from '@/lib/types';
import { Loader2 } from 'lucide-react';

// `uuid` is not in package.json, so we'll use a simple random generator
const simpleUUID = () => crypto.randomUUID();

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
  url: z.string().url('Please enter a valid URL.').or(z.literal('')),
  notes: z.string().optional(),
});

type AddEditItemDialogProps = {
  itemToEdit?: VaultItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AddEditItemDialog({ itemToEdit, isOpen, onOpenChange }: AddEditItemDialogProps) {
  const { toast } = useToast();
  const { vault, setVault, masterPassword } = useVault();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!itemToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (itemToEdit) {
      form.reset(itemToEdit);
    } else {
      form.reset({ name: '', username: '', password: '', url: '', notes: '' });
    }
  }, [itemToEdit, form, isOpen]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!vault || !masterPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Vault is not loaded or session has expired.' });
      return;
    }
    setIsLoading(true);

    const password = masterPassword;

    try {
      let updatedItems: VaultItem[];
      if (isEditing) {
        updatedItems = vault.items.map(item =>
          item.id === itemToEdit.id ? { ...item, ...values } : item
        );
      } else {
        updatedItems = [...vault.items, { id: simpleUUID(), ...values }];
      }

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
          throw new Error(errorData.error || 'Failed to save item.');
        }
        return;
      }
      
      const responseData = await response.json();
      setVault({ ...updatedVault, version: responseData.version });
      toast({ title: 'Success!', description: `Item has been ${isEditing ? 'updated' : 'added'}.` });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Make changes to "${itemToEdit.name}".` : 'Enter the details for the new vault item.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Google Account" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="username" render={({ field }) => ( <FormItem><FormLabel>Username/Email</FormLabel><FormControl><Input placeholder="e.g., user@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••••••" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="url" render={({ field }) => ( <FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Textarea placeholder="Any additional notes..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
