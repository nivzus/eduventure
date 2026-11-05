'use client';

import { ArrowLeft, KeyRound, Lock, RotateCcw, TriangleAlert } from 'lucide-react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Button, ButtonLink, Input } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CoverArt } from './CoverArt';

/** Is the thrown error a "PASSCODE required" 403 from the API? */
export function isLockedError(err: unknown): boolean {
  const e = err as { status?: number; data?: { locked?: boolean } } | null;
  return Boolean(e && e.status === 403 && e.data && e.data.locked);
}

export function isNotFound(err: unknown): boolean {
  const s = (err as { status?: number } | null)?.status;
  return s === 404;
}

/** Full-width "lost on the map" state for 404s & errors. */
export function ErrorState({
  error,
  title,
  onRetry,
  backHref,
  backLabel = 'Geri qayıt',
  className,
}: {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  const notFound = isNotFound(error);
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-line bg-elev px-6 py-14 text-center md:py-20',
        className,
      )}
    >
      <CoverArt seed={notFound ? 'lost-404' : 'storm-500'} tone={notFound ? 'glacier' : 'ember'} meta={false} className="absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl border border-line-strong bg-bg/70 backdrop-blur">
          <TriangleAlert className={cn('size-6', notFound ? 'text-glacier' : 'text-ember')} />
        </div>
        <p className="mono-label">{notFound ? 'Koordinat tapılmadı · 404' : 'Siqnal itdi'}</p>
        <h2 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
          {title ?? (notFound ? 'Bu marşrut xəritədə yoxdur' : 'Nəsə alınmadı')}
        </h2>
        <p className="mt-3 text-muted">
          {notFound ? 'Ola bilər ki, silinib və ya sizin üçün bağlıdır.' : errorMessage(error)}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onRetry && !notFound && (
            <Button variant="secondary" leftIcon={<RotateCcw className="size-4" />} onClick={onRetry}>
              Yenidən cəhd et
            </Button>
          )}
          {backHref && (
            <ButtonLink href={backHref} variant="ghost" leftIcon={<ArrowLeft className="size-4" />}>
              {backLabel}
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}

/** Passcode gate — shown when the API answers 403 {locked:true}. */
export function PasscodeGate({
  title,
  kind,
  onUnlock,
  pending,
  backHref,
}: {
  title?: string;
  kind: string;
  onUnlock: (passcode: string) => Promise<unknown>;
  pending?: boolean;
  backHref: string;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    try {
      await onUnlock(code.trim());
    } catch (err) {
      setError(errorMessage(err, 'Yanlış giriş kodu'));
      if (!reduce) controls.start({ x: [0, -12, 10, -6, 4, 0], transition: { duration: 0.45 } });
    }
  };

  return (
    <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-line bg-elev">
      <CoverArt seed={`gate-${title ?? kind}`} tone="signal" meta={false} className="h-40 md:h-48">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-elev" />
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <motion.div
            className="relative grid size-16 translate-y-1/2 place-items-center rounded-2xl border border-line-strong bg-bg shadow-pop"
            initial={reduce ? false : { rotate: -8, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <Lock className="size-6 text-signal" />
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-signal/50" aria-hidden />
          </motion.div>
        </div>
      </CoverArt>
      <div className="px-6 pt-12 pb-8 text-center md:px-10">
        <p className="mono-label">{kind} · şifrəli giriş</p>
        <h2 className="mt-3 font-display text-2xl font-semibold">{title ?? 'Bu məzmun şifrə ilə qorunur'}</h2>
        <p className="mt-2 text-muted">Müəlliminizin verdiyi giriş kodunu daxil edin.</p>
        <motion.form animate={controls} onSubmit={submit} className="mx-auto mt-6 flex max-w-sm flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Giriş kodu"
              aria-label="Giriş kodu"
              aria-invalid={Boolean(error)}
              className="pl-10 font-mono tracking-[0.2em]"
            />
          </div>
          <Button type="submit" loading={pending} disabled={!code.trim()}>
            Kilidi aç
          </Button>
        </motion.form>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <ButtonLink href={backHref} variant="ghost" size="sm" className="mt-6" leftIcon={<ArrowLeft className="size-4" />}>
          Geri qayıt
        </ButtonLink>
      </div>
    </div>
  );
}
