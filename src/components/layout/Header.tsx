'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { cn } from '@/lib/utils';
import Logo from '../Logo';
import AppContainer from './AppContainer';
import { useState } from 'react';

const navLinks = [
  { href: '/vault', label: 'Vault' },
  { href: '/generator', label: 'Generator' },
  { href: '/settings', label: 'Settings' },
];

export default function Header() {
  const { lockVault, needsSync, refreshVaultFromServer } = useVault();
  const [isSyncing, setIsSyncing] = useState(false);
  const pathname = usePathname();

  const handleRefresh = async () => {
    setIsSyncing(true);
    try {
      await refreshVaultFromServer();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
      <AppContainer className="flex h-16 items-center">
        <Logo />
        <nav className="ml-8 hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'transition-colors hover:text-primary',
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          {needsSync && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
              <AlertCircle className="h-4 w-4" />
              <span>Update available</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                disabled={isSyncing}
                className="ml-2"
              >
                {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={lockVault} aria-label="Lock Vault">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </AppContainer>
    </header>
  );
}
