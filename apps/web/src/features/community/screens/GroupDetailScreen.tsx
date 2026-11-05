'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ClipboardList, Settings2, Users } from 'lucide-react';
import { Avatar, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';
import { isAdmin, useAuth } from '@/lib/auth';
import { isApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useGroup } from '../hooks';
import { contentHref, contentMeta, groupColorVar } from '../lib/content';
import { dueInfo } from '../lib/format';
import { memberCount } from '../lib/normalize';
import type { Assignment, GroupMember } from '../types';
import { ContourField } from '../components/shared/ContourField';
import { ErrorState, InlineEmpty } from '../components/shared/States';
import { CommentThread } from '../components/comments/CommentThread';

const EASE = [0.22, 1, 0.36, 1] as const;

function MemberList({ members, teacherId, meId }: { members: GroupMember[]; teacherId?: string; meId?: string }) {
  if (!members.length) return <InlineEmpty icon={Users} title="Qrupda hələ üzv yoxdur" />;
  const sorted = [...members].sort((a, b) => (b.user?.xp ?? 0) - (a.user?.xp ?? 0));
  return (
    <ul className="-mx-2 max-h-[420px] space-y-0.5 overflow-y-auto pr-1" data-lenis-prevent>
      {sorted.map((m, i) => (
        <motion.li key={m.userId} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * Math.min(i, 15), ease: EASE }}>
          <Link
            href={`/u/${m.user?.id ?? m.userId}`}
            className={cn('flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-fg/[0.04]', m.userId === meId && 'bg-signal/[0.06]')}
          >
            <Avatar name={m.user?.name} src={m.user?.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {m.user?.name ?? 'İstifadəçi'}
                {m.userId === meId && <span className="ml-1.5 font-mono text-[10px] uppercase text-signal light:text-aurora">sən</span>}
              </span>
              {m.userId === teacherId && <span className="font-mono text-[10px] uppercase tracking-wider text-glacier">Müəllim</span>}
            </span>
            {m.user?.level != null && <span className="font-mono text-[11px] text-subtle">Sv {m.user.level}</span>}
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

function GroupAssignments({ items }: { items: Assignment[] }) {
  if (!items.length) return <InlineEmpty icon={ClipboardList} title="Qrupa tapşırıq verilməyib" hint="Yeni tapşırıqlar burada görünəcək." />;
  const sorted = [...items].sort((a, b) => +new Date(a.dueAt ?? 8.64e15) - +new Date(b.dueAt ?? 8.64e15));
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {sorted.map((a) => {
        const meta = contentMeta(a.contentType);
        const Icon = meta.icon;
        const due = dueInfo(a.dueAt, a.done);
        return (
          <li key={a.id}>
            <Link
              href={contentHref(a.contentType, a.contentId, a.content?.slug)}
              className="group/ga flex h-full items-start gap-3 rounded-2xl border border-line bg-sunken/60 p-3.5 transition-colors hover:border-line-strong"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-elev text-muted">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{meta.label}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm font-semibold leading-snug">{a.title}</span>
                <span className={cn('mt-1 block font-mono text-[11px]', due.tone === 'overdue' ? 'text-ember' : due.tone === 'done' ? 'text-moss' : 'text-muted')}>{due.label}</span>
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover/ga:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function GroupDetailScreen({ id }: { id: string }) {
  const { user } = useAuth();
  const q = useGroup(id);
  const g = q.data;

  if (q.isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-96 rounded-3xl lg:col-span-4" />
          <Skeleton className="h-96 rounded-3xl lg:col-span-8" />
        </div>
      </div>
    );
  if (q.isError || !g) {
    if (isApiError(q.error) && (q.error.status === 404 || q.error.status === 403))
      return (
        <EmptyState
          icon={Users}
          title="Qrup tapılmadı"
          description="Bu qrup silinib və ya siz onun üzvü deyilsiniz."
          action={
            <ButtonLink href="/groups" variant="secondary" leftIcon={<ArrowLeft />}>
              Qruplarıma qayıt
            </ButtonLink>
          }
        />
      );
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }

  const color = groupColorVar(g.color);
  const members = g.members ?? [];

  return (
    <div className="space-y-6 pb-10">
      <Link href="/groups" className="group inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" /> Qruplarım
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative isolate overflow-hidden rounded-3xl border border-line p-6 shadow-inner-hl sm:p-10"
        style={{ background: `linear-gradient(120deg, color-mix(in oklab, ${color} 20%, var(--bg-elev)), var(--bg-elev) 65%)` }}
      >
        <ContourField seed={g.id} x={0.85} y={0.35} rings={13} tone={`color-mix(in oklab, ${color} 50%, transparent)`} className="-z-[1]" />
        <span className="mono-label flex items-center gap-2.5">
          <span className="h-px w-6" style={{ background: color }} /> Qrup · {memberCount(g)} üzv
        </span>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-5xl">{g.name}</h1>
        {g.description && <p className="mt-4 max-w-2xl text-muted">{g.description}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {g.teacher && (
            <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-bg/40 py-1 pl-1 pr-3 backdrop-blur">
              <Avatar name={g.teacher.name} src={g.teacher.avatarUrl} size="sm" />
              <span className="text-sm">
                <span className="text-muted">Müəllim · </span>
                {g.teacher.name}
              </span>
            </span>
          )}
          {isAdmin(user) && (
            <ButtonLink href={`/admin/groups/${g.id}`} size="sm" variant="secondary" leftIcon={<Settings2 />}>
              İdarə et
            </ButtonLink>
          )}
        </div>
      </motion.header>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:sticky lg:top-24 lg:col-span-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Üzvlər</h2>
            <span className="mono-label">XP üzrə</span>
          </div>
          <MemberList members={members} teacherId={g.teacherId} meId={user?.id} />
        </Card>
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Qrup tapşırıqları</h2>
              <Link href="/assignments" className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle hover:text-fg">
                Hamısı →
              </Link>
            </div>
            <GroupAssignments items={g.assignments ?? []} />
          </Card>
          <Card>
            <CommentThread targetType="GROUP" targetId={g.id} title="Qrup müzakirəsi" />
          </Card>
        </div>
      </div>
    </div>
  );
}
