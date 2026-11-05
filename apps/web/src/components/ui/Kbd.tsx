import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** <Kbd>⌘</Kbd><Kbd>K</Kbd> */
export function Kbd({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-surface px-1.5 font-mono text-[10.5px] font-medium leading-none text-muted shadow-[inset_0_-1px_0_var(--border-strong)]',
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
