import { cn, hashString, initials } from '@/lib/utils';

const GRADIENTS = [
  ['#9B7BFF', '#7CE7FF'],
  ['#FF6B3D', '#E8FF59'],
  ['#4ADE80', '#7CE7FF'],
  ['#E8FF59', '#4ADE80'],
  ['#FF4D6D', '#9B7BFF'],
  ['#7CE7FF', '#E8FF59'],
  ['#FF6B3D', '#9B7BFF'],
];

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 88 } as const;

export interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof SIZES | number;
  className?: string;
  /** ring color for highlight (e.g. leaderboard top 3) */
  ring?: 'signal' | 'aurora' | 'ember' | 'none';
}

/** <Avatar name={user.name} src={user.avatarUrl} size="md" /> */
export function Avatar({ name, src, size = 'md', className, ring = 'none' }: AvatarProps) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const [a, b] = GRADIENTS[hashString(name ?? '?') % GRADIENTS.length];
  const ringCls = ring === 'signal' ? 'ring-2 ring-signal ring-offset-2 ring-offset-bg' : ring === 'aurora' ? 'ring-2 ring-aurora ring-offset-2 ring-offset-bg' : ring === 'ember' ? 'ring-2 ring-ember ring-offset-2 ring-offset-bg' : '';
  return (
    <span
      className={cn('relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full', ringCls, className)}
      style={{ width: px, height: px }}
      title={name ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ''} className="size-full object-cover" loading="lazy" />
      ) : (
        <span
          aria-label={name ?? undefined}
          className="flex size-full items-center justify-center font-display font-semibold text-[#0B0B10]"
          style={{
            background: `radial-gradient(120% 120% at 20% 10%, ${a}, ${b})`,
            fontSize: Math.max(9, px * 0.36),
            letterSpacing: '-0.02em',
          }}
        >
          {initials(name)}
        </span>
      )}
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
    </span>
  );
}
