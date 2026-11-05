import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { renderIcon, type IconLike } from './_internal';

export interface EmptyStateProps {
  icon?: IconLike;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** smaller, no border */
  compact?: boolean;
}

/** <EmptyState icon={Compass} title="Hələ test yoxdur" description="…" action={<Button>Yarat</Button>} /> */
export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative isolate flex flex-col items-center justify-center overflow-hidden text-center',
        compact ? 'gap-3 px-4 py-10' : 'gap-4 rounded-3xl border border-dashed border-line-strong px-6 py-16 sm:py-20',
        className,
      )}
    >
      {/* contour rings */}
      <svg aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-[1] size-[520px] -translate-x-1/2 -translate-y-[58%] text-fg opacity-[0.07]" viewBox="0 0 200 200" fill="none" stroke="currentColor">
        {[18, 30, 43, 57, 72, 88].map((r, i) => (
          <ellipse key={r} cx="100" cy="100" rx={r * 1.18} ry={r} strokeWidth={i % 3 === 2 ? 0.8 : 0.45} transform={`rotate(${i * 7} 100 100)`} />
        ))}
      </svg>
      {icon && (
        <div className="relative grid size-14 place-items-center rounded-2xl border border-line-strong bg-surface text-fg shadow-inner-hl">
          {renderIcon(icon, 'size-6', 24)}
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-signal ring-4 ring-bg" />
        </div>
      )}
      <div className="flex max-w-md flex-col gap-2">
        <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
        {description && <p className="text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
