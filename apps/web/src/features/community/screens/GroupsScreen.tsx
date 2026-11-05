'use client';

import Link from 'next/link';
import { ArrowUpRight, Settings2, Users } from 'lucide-react';
import { Stagger, StaggerItem } from '@/components/motion';
import { Avatar, ButtonLink, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { isAdmin, useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useMyGroups } from '../hooks';
import { groupColorVar } from '../lib/content';
import { memberCount } from '../lib/normalize';
import type { Group } from '../types';
import { ContourField } from '../components/shared/ContourField';
import { ErrorState } from '../components/shared/States';

export function GroupCard({ g, href }: { g: Group; href: string }) {
  const color = groupColorVar(g.color);
  const members = g.members ?? [];
  const count = memberCount(g);
  const assignments = g._count?.assignments ?? g.assignments?.length;
  return (
    <Link
      href={href}
      className="group/gc relative isolate flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-elev shadow-inner-hl transition-[transform,border-color] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className="relative h-28 overflow-hidden border-b border-line" style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${color} 22%, var(--bg-elev)), var(--bg-elev) 70%)` }}>
        <ContourField seed={g.id} x={0.78} y={0.3} rings={9} tone={`color-mix(in oklab, ${color} 55%, transparent)`} />
        <span className="absolute left-5 top-4 font-mono text-[10px] uppercase tracking-[0.14em] text-fg/70">Qrup</span>
        <span className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-fg/15 bg-bg/40 text-fg backdrop-blur transition-transform duration-300 group-hover/gc:rotate-45">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold leading-tight">{g.name}</h3>
          {g.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{g.description}</p>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m.userId} name={m.user?.name} src={m.user?.avatarUrl} size="sm" className="ring-2 ring-[var(--bg-elev)]" />
            ))}
            {count > 5 && (
              <span className="grid size-8 place-items-center rounded-full bg-surface font-mono text-[10px] text-muted ring-2 ring-[var(--bg-elev)]">+{count - 5}</span>
            )}
            {!members.length && <Users className="size-5 text-subtle" />}
          </div>
          <div className="text-right font-mono text-[11px] text-subtle">
            <div>{count} üzv</div>
            {assignments != null && <div>{assignments} tapşırıq</div>}
          </div>
        </div>
        {g.teacher?.name && (
          <p className="border-t border-line pt-3 text-xs text-muted">
            Müəllim: <span className="text-fg">{g.teacher.name}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

export function GroupsScreen() {
  const { user } = useAuth();
  const q = useMyGroups();
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="İcma"
        title={
          <>
            Mənim <em>qruplarım</em>
          </>
        }
        description="Birlikdə yol gedənlər: qrup üzvləri, ortaq tapşırıqlar və müzakirələr."
        actions={
          isAdmin(user) ? (
            <ButtonLink href="/admin/groups" variant="secondary" leftIcon={<Settings2 />}>
              Qrupları idarə et
            </ButtonLink>
          ) : undefined
        }
      />
      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={Users} title="Hələ heç bir qrupda deyilsiniz" description="Müəlliminiz sizi qrupa əlavə etdikdə qrup tapşırıqları və müzakirələr burada açılacaq." />
      ) : (
        <Stagger className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
          {q.data.map((g) => (
            <StaggerItem key={g.id}>
              <GroupCard g={g} href={`/groups/${g.id}`} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
