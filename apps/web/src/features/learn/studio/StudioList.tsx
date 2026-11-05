'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button, ButtonLink, IconButton, Input, Segmented, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Highlight, Note } from '@/components/notebook';
import { Mascot } from '@/components/brand/Mascot';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { TYPE_META, VISIBILITY_META } from '../lib/content-meta';
import { relativeTime } from '../lib/format';
import type { ContentStatus, ContentType, Visibility } from '../types';
import { ConfirmDialog, StatusBadge, StudioGuard, VIS_ICON, VisibilityModal } from './ui';

export interface StudioRow {
  id: string;
  title: string;
  status: ContentStatus;
  visibility: Visibility;
  passcode?: string | null;
  groupIds?: string[];
  category?: string | null;
  meta?: ReactNode;
  updatedAt?: string;
  viewHref?: string;
}

type Filter = 'ALL' | ContentStatus;

const TONE_BG: Record<string, string> = {
  signal: 'bg-signal/20',
  ember: 'bg-ember/30',
  aurora: 'bg-aurora/20',
  glacier: 'bg-glacier/20',
  moss: 'bg-moss/20',
};

export function StudioListScreen({
  type,
  title,
  highlight,
  description,
  newLabel,
  base,
  rows,
  isLoading,
  isError,
  onRetry,
  onDelete,
  deleting,
  emptyText,
}: {
  type: ContentType;
  title: string;
  highlight: string;
  description: string;
  newLabel: string;
  base: string;
  rows: StudioRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onDelete: (id: string) => Promise<unknown>;
  deleting: boolean;
  emptyText: string;
}) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const [filter, setFilter] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<StudioRow | null>(null);
  const [visFor, setVisFor] = useState<StudioRow | null>(null);

  const all = rows ?? [];
  const counts = useMemo(() => {
    const c = { ALL: all.length, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 } as Record<Filter, number>;
    for (const r of all) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [all]);
  const shown = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('az');
    return all
      .filter((r) => filter === 'ALL' || r.status === filter)
      .filter((r) => !term || r.title.toLocaleLowerCase('az').includes(term) || (r.category ?? '').toLocaleLowerCase('az').includes(term))
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [all, filter, q]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await onDelete(toDelete.id);
      toast.success(`«${toDelete.title}» silindi`);
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e, 'Silmək alınmadı'));
    }
  };

  return (
    <StudioGuard>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
        <Link href="/studio" className="hand text-xl text-muted hover:text-fg">← studio</Link>
        <header className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Note className="text-2xl !text-signal">studio · {meta.plural.toLocaleLowerCase('az')}</Note>
            <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">
              {title} <Highlight>{highlight}</Highlight>
            </h1>
            <p className="mt-2 max-w-xl text-muted">{description}</p>
          </div>
          <ButtonLink href={`${base}/new`} size="lg" magnetic leftIcon={<Plus />} className="self-start sm:self-auto">
            {newLabel}
          </ButtonLink>
        </header>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-none">
            <Segmented<Filter>
              size="sm"
              value={filter}
              onChange={setFilter}
              aria-label="Status filtri"
              tabs={[
                { value: 'ALL', label: 'Hamısı', count: counts.ALL },
                { value: 'DRAFT', label: 'Qaralama', count: counts.DRAFT },
                { value: 'PUBLISHED', label: 'Dərc', count: counts.PUBLISHED },
                { value: 'ARCHIVED', label: 'Arxiv', count: counts.ARCHIVED },
              ]}
            />
          </div>
          <Input
            inputSize="sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Axtar…"
            leftIcon={<Search className="size-4" />}
            wrapperClassName="md:w-64"
            aria-label="Axtar"
          />
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-10 grid place-items-center text-center">
            <Mascot mode="sad" size={100} />
            <p className="hand mt-4 text-2xl text-muted">Siyahını yükləmək alınmadı</p>
            <Button variant="secondary" className="mt-4" onClick={onRetry}>Yenidən cəhd et</Button>
          </div>
        ) : !shown.length ? (
          <div className="paper-ruled mt-6 grid place-items-center rounded-3xl border-2 border-dashed border-line-strong bg-elev px-6 py-14 text-center">
            <Mascot mode="peek" size={110} />
            <p className="hand mt-4 text-2xl text-muted">{all.length ? 'Bu filtrə uyğun heç nə yoxdur' : emptyText}</p>
            {!all.length && (
              <ButtonLink href={`${base}/new`} className="mt-5" leftIcon={<Plus />}>{newLabel}</ButtonLink>
            )}
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {shown.map((r, i) => {
              const VisIcon = VIS_ICON[r.visibility] ?? VIS_ICON.PUBLIC;
              return (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-elev p-4 shadow-stamp-sm sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink', TONE_BG[meta.tone])}>
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <Link href={`${base}/${r.id}`} className="block truncate font-display text-lg font-semibold hover:underline">
                        {r.title || 'Adsız'}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        {r.category && <span className="hand text-lg leading-none text-signal">{r.category}</span>}
                        {r.meta && <span>{r.meta}</span>}
                        {r.updatedAt && <span className="text-subtle">· {relativeTime(r.updatedAt)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <StatusBadge status={r.status} />
                    <button
                      type="button"
                      onClick={() => setVisFor(r)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:border-ink hover:text-fg"
                      title="Görünməni dəyiş"
                    >
                      <VisIcon className="size-3.5" />
                      {VISIBILITY_META[r.visibility]?.short ?? r.visibility}
                    </button>
                    <span className="ml-auto flex items-center gap-1 sm:ml-2">
                      {r.viewHref && r.status === 'PUBLISHED' && (
                        <Link href={r.viewHref} aria-label="Bax" title="Bax" className="grid size-9 place-items-center rounded-xl text-muted hover:bg-fg/[0.06] hover:text-fg">
                          <Eye className="size-4" />
                        </Link>
                      )}
                      <ButtonLink href={`${base}/${r.id}`} size="sm" variant="secondary" leftIcon={<Pencil />}>
                        Redaktə
                      </ButtonLink>
                      <IconButton label="Sil" icon={<Trash2 className="size-4" />} onClick={() => setToDelete(r)} className="text-danger" />
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`${meta.label} silinsin?`}
        description={toDelete ? `«${toDelete.title}» həmişəlik silinəcək. Bu əməliyyatı geri qaytarmaq olmur.` : undefined}
      />
      <VisibilityModal open={Boolean(visFor)} onClose={() => setVisFor(null)} type={type} item={visFor} />
    </StudioGuard>
  );
}
