import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Brand mark: the Eduventure cat on an orange tile (ears, eyes, whiskers, a tiny summit contour). */
export function LogoMark({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8', className)} aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" rx="10" className="fill-signal" />
      <path
        d="M7 24.6c0-5.6 1.3-8.9 2.5-10.6L8.6 6.4l5.2 3.5a12 12 0 0 1 4.4 0l5.2-3.5-.9 7.6c1.2 1.7 2.5 5 2.5 10.6-5.6 2.6-12.4 2.6-18 0Z"
        fill="var(--signal-fg)"
        className={animated ? 'origin-center [animation:float_3s_ease-in-out_infinite]' : undefined}
      />
      <ellipse cx="12.6" cy="17.4" rx="1.35" ry="1.8" className="fill-signal" />
      <ellipse cx="19.4" cy="17.4" rx="1.35" ry="1.8" className="fill-signal" />
      <path d="M15.1 20.5h1.8l-.9 1z" className="fill-signal" />
      <path d="M3.6 19.6l4.4.7M3.6 22.4l4.4-.5M28.4 19.6l-4.4.7M28.4 22.4l-4.4-.5" stroke="var(--signal-fg)" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M10.5 25.2c1.8-.9 3.6-.9 5.5 0 1.9.9 3.7.9 5.5 0" className="stroke-signal" strokeOpacity=".7" strokeWidth="1" strokeLinecap="round" />
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
