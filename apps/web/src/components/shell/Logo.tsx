import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Summit mark: two peaks, a contour, a flag. */
export function LogoMark({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8', className)} aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" rx="10" className="fill-signal" />
      <path d="M5 24.5 12.2 13l3.6 5.4L19.6 11 27 24.5" stroke="var(--signal-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={animated ? '[stroke-dasharray:60] [animation:dash-in_1.4s_var(--ease-out-expo)_both]' : undefined} />
      <path d="M19.6 11V5.5l4.2 1.7-4.2 1.7" stroke="var(--signal-fg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 27.2c3-1.1 5.6-1.1 7.8 0 2.4 1.1 4.9 1.1 7.4 0" stroke="var(--signal-fg)" strokeOpacity=".45" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-[17px] font-semibold tracking-[-0.04em]', className)}>
      eduventure<span className="text-signal light:text-ember">.</span>
    </span>
  );
}

export function Logo({ href = '/', compact, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="Eduventure — ana səhifə">
      <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:-rotate-6 group-hover:scale-105" />
      {!compact && <Wordmark />}
    </Link>
  );
}
