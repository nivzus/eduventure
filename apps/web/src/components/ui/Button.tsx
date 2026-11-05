'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Magnetic } from '@/components/motion/Magnetic';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'group/btn relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold tracking-[-0.01em] ' +
  'transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out-expo ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2';

const variants: Record<ButtonVariant, string> = {
  primary:
    'overflow-hidden bg-signal text-signal-fg shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_1px_2px_rgba(0,0,0,.25)] hover:shadow-glow ' +
    "before:pointer-events-none before:absolute before:inset-y-0 before:-left-1/2 before:w-1/2 before:skew-x-[-20deg] before:bg-gradient-to-r before:from-transparent before:via-white/45 before:to-transparent before:opacity-0 before:content-[''] " +
    'hover:before:animate-[sheen_0.9s_var(--ease-out-expo)] hover:before:opacity-100',
  secondary: 'border border-line bg-surface text-fg shadow-inner-hl hover:border-line-strong hover:bg-[color-mix(in_oklab,var(--surface)_88%,var(--fg))]',
  ghost: 'text-muted hover:bg-fg/[0.06] hover:text-fg',
  outline: 'border border-line-strong text-fg hover:border-fg/40 hover:bg-fg/[0.04]',
  danger: 'bg-danger text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25)] hover:brightness-110',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-xl px-3.5 text-[13px]',
  md: 'h-11 gap-2 rounded-2xl px-5 text-sm',
  lg: 'h-14 gap-2.5 rounded-2xl px-7 text-[15px]',
};

const iconSize: Record<ButtonSize, number> = { sm: 15, md: 17, lg: 19 };

export function buttonVariants({ variant = 'primary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** cursor-magnet effect (use for hero/primary CTAs) */
  magnetic?: boolean;
  /** stretch to container width */
  block?: boolean;
}

export interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

function Inner({ leftIcon, rightIcon, children, loading, size = 'md' }: { leftIcon?: ReactNode; rightIcon?: ReactNode; children?: ReactNode; loading?: boolean; size?: ButtonSize }) {
  return (
    <>
      {loading ? (
        <Spinner size={iconSize[size]} />
      ) : leftIcon ? (
        <span className="inline-flex shrink-0 [&>svg]:size-[1.15em]">{leftIcon}</span>
      ) : null}
      {children !== undefined && children !== null && <span className="relative truncate">{children}</span>}
      {rightIcon && (
        <span className="inline-flex shrink-0 transition-transform duration-300 ease-out-expo group-hover/btn:translate-x-0.5 [&>svg]:size-[1.15em]">
          {rightIcon}
        </span>
      )}
    </>
  );
}

/**
 * <Button variant="primary" size="lg" leftIcon={<Play />} loading={isPending} magnetic>Başla</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  magnetic,
  block,
  className,
  children,
  disabled,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  const btn = (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, className: cn(block && 'w-full', className) })}
      {...rest}
    >
      <Inner leftIcon={leftIcon} rightIcon={rightIcon} loading={loading} size={size}>
        {children}
      </Inner>
    </button>
  );
  return magnetic ? <Magnetic className={block ? 'flex w-full' : undefined}>{btn}</Magnetic> : btn;
}

export interface ButtonLinkProps extends CommonProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  /** open in new tab with rel=noopener */
  external?: boolean;
  prefetch?: boolean;
}

/** Link styled as a button. <ButtonLink href="/quizzes" rightIcon={<ArrowRight />}>Testlər</ButtonLink> */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  magnetic,
  block,
  external,
  className,
  children,
  prefetch,
  ...rest
}: ButtonLinkProps) {
  const cls = buttonVariants({ variant, size, className: cn(block && 'w-full', className) });
  const content = (
    <Inner leftIcon={leftIcon} rightIcon={rightIcon} size={size}>
      {children}
    </Inner>
  );
  const el = external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
      {content}
    </a>
  ) : (
    <Link href={href} prefetch={prefetch} className={cls} {...rest}>
      {content}
    </Link>
  );
  return magnetic ? <Magnetic className={block ? 'flex w-full' : undefined}>{el}</Magnetic> : el;
}
