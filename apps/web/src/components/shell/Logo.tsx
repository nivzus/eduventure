import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BookCatMark, OfficialWordmark } from '@/components/brand/BookCat';

/** Brand mark: the official open-book + cat logo (vector). */
export function LogoMark({ className, animated }: { className?: string; animated?: boolean }) {
  return <BookCatMark animated={animated} className={cn('size-10', className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return <OfficialWordmark className={cn('h-[30px] w-auto', className)} />;
}

export function Logo({ href = '/', compact, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn('group inline-flex items-center gap-2.5', className)} aria-label="Eduventure — ana səhifə">
      <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:-rotate-3 group-hover:scale-105" />
      {!compact && <Wordmark />}
    </Link>
  );
}
