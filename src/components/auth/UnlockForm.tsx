'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { decryptVault } from '@/lib/crypto';
import type { EncryptedVault } from '@/lib/types';
import { useVault } from '@/context/VaultContext';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function UnlockForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { setUnlockedVault } = useVault();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/vault');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Could not fetch vault. Have you registered?');
      }
      
      const encryptedData: EncryptedVault = await response.json();
      
      const decryptedVault = await decryptVault(
        encryptedData.ciphertext,
        encryptedData.nonce,
        encryptedData.salt,
        encryptedData.params,
        values.password
      );

      // Store the full decrypted vault and the master password in context
      setUnlockedVault({ ...decryptedVault, version: encryptedData.version }, values.password);
      
      toast({
        title: 'Success!',
        description: 'Your vault has been unlocked.',
      });

      router.replace('/vault');

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Unlock Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
      form.reset();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Master Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
           {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Unlock
        </Button>
      </form>
    </Form>
  );
}
