import Link from 'next/link';
import { Mascot } from '@/components/brand/Mascot';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Mascot mode="sad" size={170} className="mx-auto" />
        <p className="mono-label mt-6">Xəta 404 · Marşrut tapılmadı</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.03em] sm:text-7xl">
          Yolu <span className="serif-accent text-signal">azdıq</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">Axtardığın səhifə xəritədə yoxdur. Baza düşərgəsinə qayıdaq.</p>
        <Link href="/dashboard" className="mt-8 inline-flex h-12 items-center rounded-2xl bg-signal px-6 font-semibold text-signal-fg">
          Baza düşərgəsinə
        </Link>
      </div>
    </main>
  );
}
