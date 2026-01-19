import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { VaultProvider } from '@/context/VaultContext';

export const metadata: Metadata = {
  title: 'Crypt Keeper',
  description: 'Securely manage your passwords.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn('font-body antialiased min-h-screen flex flex-col')}>
        <VaultProvider>
          {children}
        </VaultProvider>
        <Toaster />
      </body>
    </html>
  );
}
