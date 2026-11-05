import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BookCatMark, LOGO_ORANGE } from '@/components/brand/BookCat';

/** Brand mark: the official open-book + cat logo (vector). */
export function LogoMark({ className, animated }: { className?: string; animated?: boolean }) {
  return <BookCatMark animated={animated} className={cn('size-9', className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex flex-col font-brand uppercase leading-none', className)} style={{ color: LOGO_ORANGE }}>
      <span className="text-[17px] font-bold tracking-[0.04em]">Eduventure</span>
      <span className="mt-[3px] text-[9px] font-bold tracking-[0.26em] opacity-90">with Seda</span>
    </span>
  );
}

export function Logo({ href = '/', compact, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="Eduventure — ana səhifə">
      <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:-rotate-3 group-hover:scale-105" />
      {!compact && <Wordmark />}
    </Link>
  );
}
