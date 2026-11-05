'use client';

import { Search, X } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string;
  onChange: (v: string) => void;
  size?: 'md' | 'lg';
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, className, size = 'md', placeholder = 'Axtar…', ...rest },
  ref,
) {
  return (
    <label
      className={cn(
        'group relative flex items-center rounded-2xl border border-line bg-elev transition-colors focus-within:border-line-strong focus-within:bg-surface',
        size === 'lg' ? 'h-14 md:h-16' : 'h-11',
        className,
      )}
    >
      <Search className={cn('pointer-events-none absolute text-subtle transition-colors group-focus-within:text-fg', size === 'lg' ? 'left-5 size-5' : 'left-3.5 size-4')} />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-full w-full min-w-0 bg-transparent text-fg outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden',
          size === 'lg' ? 'pr-12 pl-14 font-display text-lg md:text-xl' : 'pr-9 pl-10 text-sm',
        )}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Təmizlə"
          className={cn('absolute grid place-items-center rounded-full text-subtle hover:bg-fg/10 hover:text-fg', size === 'lg' ? 'right-4 size-8' : 'right-2 size-7')}
        >
          <X className="size-4" />
        </button>
      )}
    </label>
  );
});
