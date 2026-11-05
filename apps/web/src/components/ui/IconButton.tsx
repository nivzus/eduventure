'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** accessible name (required) — also used for the tooltip */
  label: string;
  icon?: ReactNode;
  children?: ReactNode;
  variant?: 'ghost' | 'secondary' | 'outline' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** show a tooltip with `label` on hover/focus */
  tooltip?: boolean;
  /** small dot / count badge in the corner */
  badge?: number | boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

const variants = {
  ghost: 'text-muted hover:text-fg hover:bg-fg/[0.07]',
  secondary: 'border border-line bg-surface text-fg shadow-inner-hl hover:border-line-strong',
  outline: 'border border-line-strong text-fg hover:bg-fg/[0.05]',
  primary: 'bg-signal text-signal-fg hover:shadow-glow',
  danger: 'text-danger hover:bg-danger/12',
};
const sizes = { sm: 'size-8 rounded-xl [&_svg]:size-4', md: 'size-10 rounded-2xl [&_svg]:size-[18px]', lg: 'size-12 rounded-2xl [&_svg]:size-5' };

/** <IconButton label="Bağla" icon={<X />} /> */
export function IconButton({ label, icon, children, variant = 'ghost', size = 'md', loading, tooltip, badge, className, type = 'button', disabled, ref, ...rest }: IconButtonProps) {
  const btn = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-out-expo active:scale-[0.94] disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : (icon ?? children)}
      {badge ? (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 inline-flex items-center justify-center rounded-full bg-ember font-mono text-[10px] font-bold leading-none text-white ring-2 ring-bg',
            typeof badge === 'number' ? 'h-4 min-w-4 px-1' : 'size-2.5',
          )}
        >
          {typeof badge === 'number' ? (badge > 99 ? '99+' : badge) : null}
        </span>
      ) : null}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{btn}</Tooltip> : btn;
}
