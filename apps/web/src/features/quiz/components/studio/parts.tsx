'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { Highlight, Note } from '@/components/notebook';
import { cn } from '@/lib/utils';
import { STATUS_LABEL } from '../../lib/constants';
import type { ContentStatus } from '../../types';

export function StudioHeader({
  eyebrow,
  title,
  accent,
  description,
  actions,
  back,
}: {
  eyebrow: string;
  title: ReactNode;
  accent?: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8">
      {back && (
        <Link href={back.href} className="hand text-xl text-muted hover:text-fg">
          ← {back.label}
        </Link>
      )}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Note className="text-2xl !text-signal">{eyebrow}</Note>
          <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">
            {title} {accent && <Highlight>{accent}</Highlight>}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

const STATUS_STYLE: Record<ContentStatus, string> = {
  DRAFT: 'bg-sunken text-muted',
  PUBLISHED: 'bg-moss/20 text-moss',
  ARCHIVED: 'bg-line text-subtle',
};

export function StatusPill({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold', STATUS_STYLE[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Chip input: Enter / comma adds, Backspace on empty removes last. */
export function TagInput({
  value,
  onChange,
  placeholder = 'teq əlavə et…',
  suggestions,
  className,
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  const listId = suggestions?.length ? `${id ?? 'tags'}-list` : undefined;
  return (
    <div
      className={cn(
        'flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-2 py-1.5 focus-within:border-ink',
        className,
      )}
    >
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full border border-ink/60 bg-ember/25 py-0.5 pl-2.5 pr-1 text-sm font-semibold">
          {t}
          <button type="button" aria-label={`${t} teqini sil`} onClick={() => onChange(value.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-ink/10">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        list={listId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => add(draft)}
        placeholder={value.length ? '' : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-subtle"
      />
      {listId && (
        <datalist id={listId}>
          {suggestions!.filter((s) => !value.includes(s)).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Sil',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

/** Ruled notebook sheet with hard ink border — the studio's main surface. */
export function Sheet({ children, className, ruled = false }: { children: ReactNode; className?: string; ruled?: boolean }) {
  return (
    <section className={cn('relative rounded-3xl border-2 border-ink bg-elev p-4 shadow-stamp sm:p-6', ruled && 'paper-ruled pl-14 sm:pl-16', className)}>
      {children}
    </section>
  );
}
