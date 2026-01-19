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
import { buildEmptyVault, encryptVault } from '@/lib/crypto';
import { persistEncryptedVault } from '@/lib/storage';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  login: z.string().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, { message: 'Login: letters, digits, . _ -' }),
  password: z.string().min(12, { message: 'Password must be at least 12 characters long.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      login: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const login = values.login.toLowerCase();
      const emptyVault = buildEmptyVault();

      const encrypted = await encryptVault(emptyVault, values.password);

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login,
          ...encrypted,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create vault.');
      }

      await persistEncryptedVault(login, encrypted);
      
      toast({
        title: 'Vault Created!',
        description: 'Your secure vault has been created. You can now unlock it.',
      });
      
      router.push('/unlock');

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Login</FormLabel>
              <FormControl>
                <Input placeholder="e.g. vanya" autoCapitalize="none" autoCorrect="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Master Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Vault
        </Button>
      </form>
    </Form>
  );
}
