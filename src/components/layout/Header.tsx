'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { cn } from '@/lib/utils';
import Logo from '../Logo';
import AppContainer from './AppContainer';

const navLinks = [
  { href: '/vault', label: 'Vault' },
  { href: '/generator', label: 'Generator' },
  { href: '/settings', label: 'Settings' },
];

export default function Header() {
  const { lockVault } = useVault();
  const pathname = usePathname();

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
          <Button variant="ghost" size="icon" onClick={lockVault} aria-label="Lock Vault">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </AppContainer>
    </header>
  );
}
