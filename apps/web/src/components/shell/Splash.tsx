import { LogoMark } from './Logo';

/** Full-screen branded loader (auth resolving, route-level suspense). */
export function Splash({ label = 'Ekspedisiya hazırlanır' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <span className="absolute inset-0 animate-pulse-ring rounded-[12px] bg-signal/40" />
          <LogoMark className="relative size-12" animated />
        </div>
        <div className="flex items-center gap-3">
          <span className="relative h-px w-16 overflow-hidden bg-line-strong">
            <span className="absolute inset-y-0 left-0 w-1/2 animate-[shimmer_1.2s_ease-in-out_infinite] bg-signal light:bg-fg" />
          </span>
          <span className="mono-label">{label}</span>
        </div>
      </div>
    </div>
  );
}
