'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, Copy, Eye, FileCheck2, Lock, MoreHorizontal, Pencil, Plus, Search, Trash2, Undo2 } from 'lucide-react';
import { ButtonLink, IconButton, Input, Menu, Segmented, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Mascot } from '@/components/brand/Mascot';
import { cn } from '@/lib/utils';
import { useCloneQuiz, useDeleteQuiz, useQuizzes, useUpdateQuiz } from '../../hooks';
import { STATUS_LABEL, VISIBILITY_LABEL } from '../../lib/constants';
import { errorMessage, formatRelative, resolveCoverColor } from '../../lib/utils';
import type { ContentStatus, QuizListItem } from '../../types';
import { ConfirmModal, StatusPill, StudioHeader } from './parts';
import { VisibilityModal } from './StudioModals';

type Filter = 'ALL' | ContentStatus;

export function StudioQuizzes() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data, isLoading } = useQuizzes({ mine: true });
  const update = useUpdateQuiz();
  const clone = useCloneQuiz();
  const del = useDeleteQuiz();
  const [toDelete, setToDelete] = useState<QuizListItem | null>(null);
  const [visFor, setVisFor] = useState<QuizListItem | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: 0, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
    for (const x of data ?? []) {
      c.ALL++;
      c[x.status]++;
    }
    return c;
  }, [data]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (x) =>
        (filter === 'ALL' || x.status === filter) &&
        (!needle || x.title.toLowerCase().includes(needle) || (x.category ?? '').toLowerCase().includes(needle) || x.tags.some((t) => t.toLowerCase().includes(needle))),
    );
  }, [data, q, filter]);

  const setStatus = async (quiz: QuizListItem, status: ContentStatus) => {
    try {
      await update.mutateAsync({ id: quiz.id, data: { status } });
      toast.success(`“${quiz.title}” — ${STATUS_LABEL[status].toLowerCase()}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const doClone = async (quiz: QuizListItem) => {
    try {
      const c = await clone.mutateAsync(quiz.id);
      toast.success('Surəti yaradıldı');
      if (c?.id) router.push(`/studio/quizzes/${c.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success('Test silindi');
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
      <StudioHeader
        back={{ href: '/studio', label: 'studiya' }}
        eyebrow="müəllim studiyası"
        title="Mənim"
        accent="testlərim"
        description="Testləri yarat, dərc et, kimin görəcəyini seç."
        actions={
          <ButtonLink href="/studio/quizzes/new" leftIcon={<Plus />}>
            Yeni test
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          tabs={(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as Filter[]).map((f) => ({
            value: f,
            label: f === 'ALL' ? 'Hamısı' : STATUS_LABEL[f],
            count: counts[f],
          }))}
          className="max-w-full overflow-x-auto"
        />
        <Input leftIcon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlıq, kateqoriya, teq…" wrapperClassName="md:w-72" />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : !list.length ? (
          <div className="paper-ruled grid place-items-center rounded-3xl border-2 border-dashed border-line-strong bg-elev px-6 py-14 pl-14 text-center">
            <Mascot mode="peek" size={110} message={data?.length ? 'Belə test tapmadım' : 'İlk testini yaradaq?'} />
            <p className="hand mt-5 text-2xl text-muted">{data?.length ? 'Filtrə uyğun test yoxdur' : 'Hələ test yoxdur'}</p>
            {!data?.length && (
              <ButtonLink href="/studio/quizzes/new" className="mt-4" leftIcon={<Plus />}>
                Test yarat
              </ButtonLink>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((quiz) => (
              <li
                key={quiz.id}
                className="group flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-elev px-3 py-3 shadow-paper transition-colors hover:border-ink sm:flex-nowrap sm:px-4"
              >
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink font-display text-lg font-bold text-[#2a1f17]"
                  style={{ background: resolveCoverColor(quiz.coverColor, quiz.id) }}
                >
                  {quiz.title.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/studio/quizzes/${quiz.id}`} className="block truncate font-display text-lg font-bold hover:text-signal">
                    {quiz.title}
                  </Link>
                  <p className="truncate text-sm text-muted">
                    {quiz.questionCount} sual
                    {typeof quiz.attemptsCount === 'number' ? ` · ${quiz.attemptsCount} cəhd` : ''}
                    {quiz.category ? ` · ${quiz.category}` : ''} · {formatRelative(quiz.updatedAt)}
                  </p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Menu
                    label="Statusu dəyiş"
                    trigger={
                      <button type="button" className="rounded-full" aria-label="Statusu dəyiş">
                        <StatusPill status={quiz.status} className="cursor-pointer hover:-translate-y-0.5 transition-transform" />
                      </button>
                    }
                    items={(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as ContentStatus[]).map((s) => ({
                      label: STATUS_LABEL[s],
                      icon: s === 'PUBLISHED' ? FileCheck2 : s === 'ARCHIVED' ? Archive : Undo2,
                      disabled: s === quiz.status,
                      onClick: () => setStatus(quiz, s),
                    }))}
                  />
                  <button
                    type="button"
                    onClick={() => setVisFor(quiz)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-semibold text-muted hover:border-ink hover:text-fg',
                      quiz.visibility !== 'PUBLIC' && 'border-aurora/50 text-aurora',
                    )}
                  >
                    <Lock className="size-3" /> {VISIBILITY_LABEL[quiz.visibility]}
                  </button>
                  <span className="flex-1 sm:hidden" />
                  <ButtonLink href={`/studio/quizzes/${quiz.id}`} variant="ghost" size="sm" leftIcon={<Pencil />} className="hidden md:inline-flex">
                    Redaktə
                  </ButtonLink>
                  <Menu
                    label="Əməliyyatlar"
                    trigger={
                      <IconButton label="Əməliyyatlar" variant="ghost" size="sm">
                        <MoreHorizontal />
                      </IconButton>
                    }
                    items={[
                      { label: 'Redaktə et', icon: Pencil, href: `/studio/quizzes/${quiz.id}` },
                      { label: 'Önizlə', icon: Eye, href: `/quizzes/${quiz.id}` },
                      { label: 'Surətini çıxar', icon: Copy, onClick: () => doClone(quiz) },
                      { label: 'Görünürlük', icon: Lock, onClick: () => setVisFor(quiz) },
                      { separator: true },
                      { label: 'Sil', icon: Trash2, danger: true, onClick: () => setToDelete(quiz) },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        loading={del.isPending}
        title="Testi silək?"
        description={toDelete ? `“${toDelete.title}” və onun bütün cəhdləri birdəfəlik silinəcək.` : undefined}
      />
      <VisibilityModal open={Boolean(visFor)} onClose={() => setVisFor(null)} quiz={visFor} />
      {clone.isPending && <span className="sr-only">Surət hazırlanır…</span>}
    </div>
  );
}
