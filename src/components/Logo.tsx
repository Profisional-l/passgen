import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-foreground hover:text-primary transition-colors", className)}>
      <ShieldCheck className="h-8 w-8 text-primary" />
      <span className="text-xl font-headline font-semibold tracking-wider">
        Crypt Keeper
      </span>
    </Link>
  );
}
