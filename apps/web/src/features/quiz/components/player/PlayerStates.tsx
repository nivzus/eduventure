'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { CloudOff, Lock, MapPinOff, RotateCcw } from 'lucide-react';
import { Button, ButtonLink, Skeleton } from '@/components/ui';
import { errorMessage, errorStatus } from '../../lib/utils';

export function PlayerSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-live="polite">
      <div className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-24 rounded-2xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-12 sm:px-6">
        <div className="flex items-end gap-4">
          <Skeleton className="h-20 w-24 rounded-2xl" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="mt-8 h-8 w-full" />
        <Skeleton className="mt-3 h-8 w-2/3" />
        <div className="mt-10 grid gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
        {label && <p className="mt-10 text-center mono-label">{label}</p>}
      </div>
    </div>
  );
}

export function PlayerError({
  error,
  onRetry,
  title,
  description,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  description?: string;
}) {
  const status = errorStatus(error);
  const Icon = status === 403 ? Lock : status === 404 ? MapPinOff : CloudOff;
  const heading =
    title ??
    (status === 404
      ? 'Bu cəhd tapılmadı'
      : status === 403
        ? 'Bu cəhdə giriş yoxdur'
        : 'Marşrut yüklənmədi');
  const text =
    description ??
    (status === 404
      ? 'Link köhnə ola bilər və ya cəhd silinib.'
      : status === 403
        ? 'Bu cəhd başqa istifadəçiyə məxsusdur.'
        : errorMessage(error, 'Şəbəkə bağlantısını yoxla və yenidən cəhd et.'));

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-w-md flex-col items-center text-center"
      >
        <span className="mb-6 grid h-16 w-16 place-items-center rounded-3xl border border-line bg-elev text-muted">
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-3 text-muted">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onRetry && status !== 404 && status !== 403 && (
            <Button variant="secondary" leftIcon={<RotateCcw />} onClick={onRetry}>
              Yenidən cəhd et
            </Button>
          )}
          <ButtonLink href="/quizzes">Testlərə qayıt</ButtonLink>
        </div>
        <Link href="/dashboard" className="mt-6 text-sm text-subtle underline-offset-4 hover:text-fg hover:underline">
          İdarə panelinə keç
        </Link>
      </motion.div>
    </div>
  );
}
