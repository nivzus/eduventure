'use client';

import { Mascot } from '@/components/brand/Mascot';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div>
        <Mascot mode="sad" size={150} className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.03em]">Nəsə səhv getdi</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">Bir az gözləyib yenidən cəhd et.</p>
        <button onClick={reset} className="mt-8 inline-flex h-12 items-center rounded-2xl bg-signal px-6 font-semibold text-signal-fg">
          Yenidən cəhd et
        </button>
      </div>
    </main>
  );
}
