import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, KeyRound } from 'lucide-react';
import Logo from '@/components/Logo';
import AppContainer from '@/components/layout/AppContainer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4">
        <AppContainer className="flex items-center justify-between">
          <Logo />
        </AppContainer>
      </header>

      <main className="flex-grow flex items-center">
        <AppContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-headline text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
                Crypt Keeper
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-body">
                Your personal, secure, and private password vault. All encryption and decryption happens right in your browser. Your master password never leaves your device.
              </p>
              <div className="flex gap-4 justify-center md:justify-start pt-4">
                <Button asChild size="lg">
                  <Link href="/register">
                    <Lock className="mr-2" /> Create a New Vault
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/unlock">
                    <KeyRound className="mr-2" /> Unlock Existing Vault
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative flex items-center justify-center p-8">
               <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
               <ShieldCheck className="relative h-64 w-64 text-primary animate-pulse-slow" strokeWidth={0.5} />
            </div>
          </div>
        </AppContainer>
      </main>

      <footer className="py-8">
        <AppContainer className="text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} Crypt Keeper. All your secrets are safe with you.</p>
        </AppContainer>
      </footer>
    </div>
  );
}
