import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** <Skeleton className="h-6 w-40" /> — shimmering placeholder */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-xl bg-fg/[0.06]',
        "after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-fg/[0.07] after:to-transparent after:content-['']",
        className,
      )}
      {...rest}
    />
  );
}
