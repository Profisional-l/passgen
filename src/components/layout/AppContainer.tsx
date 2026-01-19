import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type AppContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function AppContainer({ children, className }: AppContainerProps) {
  return (
    <div className={cn('container mx-auto px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
