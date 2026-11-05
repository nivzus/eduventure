'use client';

import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Target, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NumberTicker, Stagger, StaggerItem } from '@/components/motion';
import { ButtonLink, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { AZ_WEEKDAYS, cn, formatDate } from '@/lib/utils';
import { useLeaderboard, useMeSummary, useMyAssignments, useQuests } from '../hooks';
import { firstName, greetingFor, pct } from '../lib/format';
import type { MeSummary } from '../types';
import { Panel } from '../components/shared/Panel';
import { ErrorState, InlineEmpty } from '../components/shared/States';
import { ContourField } from '../components/shared/ContourField';
import { Altimeter } from '../components/dashboard/Altimeter';
import { StreakFlame } from '../components/dashboard/StreakFlame';
import { ActivityHeatmap } from '../components/dashboard/ActivityHeatmap';
import { QuestList } from '../components/dashboard/QuestList';
import { ContinueLearning } from '../components/dashboard/ContinueLearning';
import { AssignmentsDue, DueCards, RecentAttempts, WeakTopics } from '../components/dashboard/Tiles';
import { LeaderRow } from '../components/leaderboard/LeaderRow';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ─────────── greeting ─────────── */

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Greeting({ name, summary, dueSoon }: { name?: string; summary?: MeSummary; dueSoon: number }) {
  const now = useClock();
  const g = greetingFor(now?.getHours() ?? 12);
  const time = now ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '--:--';
  const bits: string[] = [];
  if (summary?.cardsDue) bits.push(`${summary.cardsDue} kart təkrar gözləyir`);
  if (dueSoon) bits.push(`${dueSoon} tapşırığın vaxtı yaxınlaşır`);
  const todo = bits.length ? `Bu gün ${bits.join(' və ')}.` : g.line;

  return (
    <header className="relative flex flex-col gap-6 pb-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <motion.div
          className="mono-label flex flex-wrap items-center gap-x-2.5 gap-y-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <span className="h-px w-6 bg-signal light:bg-fg" />
          <span>Baza düşərgəsi</span>
          <span className="text-line-strong">/</span>
          <span suppressHydrationWarning>{now ? `${AZ_WEEKDAYS[now.getDay()]}, ${formatDate(now)}` : ''}</span>
          <span className="text-line-strong">/</span>
          <span suppressHydrationWarning className="tabular text-muted">{time}</span>
        </motion.div>
        <motion.h1
          className="mt-4 font-display text-[clamp(2.25rem,6.4vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.035em]"
          initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
        >
          <span suppressHydrationWarning>{now ? g.hello : 'Xoş gəlmisiniz'},</span>
          <br />
          <span className="accent pr-2 text-[1.12em] text-signal light:text-aurora">{firstName(name)}</span>
          <span className="text-subtle">.</span>
        </motion.h1>
        <motion.p
          className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          suppressHydrationWarning
        >
          <span className="text-fg">{now ? g.camp : 'Ekspedisiya'}.</span> {todo}
        </motion.p>
      </div>
      <motion.div
        className="flex flex-wrap items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.22 }}
      >
        <ButtonLink href="/practice" magnetic size="lg" leftIcon={<Sparkles />}>
          Ağıllı məşq
        </ButtonLink>
        <ButtonLink href="/quizzes" variant="secondary" size="lg" rightIcon={<ArrowRight />}>
          Testlər
        </ButtonLink>
      </motion.div>
    </header>
  );
}

/* ─────────── stats strip ─────────── */

function StatsStrip({ s }: { s: MeSummary }) {
  const items = [
    { label: 'Reytinq', value: s.rank ?? 0, prefix: s.rank ? '#' : '', fallback: s.rank ? undefined : '—' },
    { label: 'Testlər', value: s.quizzesTaken },
    { label: 'Orta nəticə', value: Math.round(pct(s.avgPercent)), suffix: '%' },
    { label: 'Məqalələr', value: s.articlesRead },
    { label: 'Kurslar', value: s.coursesCompleted },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-5">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          className={cn('bg-elev px-5 py-4', i === 0 && 'col-span-2 sm:col-span-1')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 + i * 0.05, duration: 0.5 }}
        >
          <dt className="mono-label">{it.label}</dt>
          <dd className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-[28px]">
            {it.fallback ?? <NumberTicker value={it.value} prefix={it.prefix} suffix={it.suffix} />}
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}

/* ─────────── mini leaderboard ─────────── */

function MiniLeaderboard({ meId }: { meId?: string }) {
  const lb = useLeaderboard('week');
  if (lb.isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  if (lb.isError) return <ErrorState compact error={lb.error} onRetry={() => lb.refetch()} />;
  const list = lb.data ?? [];
  if (!list.length) return <InlineEmpty icon={Trophy} title="Bu həftə hələ heç kim xal toplamayıb" hint="İlk test sizi zirvəyə çıxara bilər." />;
  const top = list.slice(0, 5);
  const mine = list.find((e) => e.user.id === meId);
  const max = list[0]?.xp ?? 1;
  return (
    <ol className="space-y-1">
      {top.map((e, i) => (
        <LeaderRow key={e.user.id} entry={e} max={max} me={e.user.id === meId} index={i} compact />
      ))}
      {mine && !top.includes(mine) && (
        <>
          <li aria-hidden className="py-1 text-center font-mono text-xs text-subtle">···</li>
          <LeaderRow entry={mine} max={max} me compact />
        </>
      )}
    </ol>
  );
}

/* ─────────── skeleton ─────────── */

function DashboardSkeleton() {
  const spans = ['lg:col-span-4 lg:row-span-2 h-[420px]', 'lg:col-span-8 h-[260px]', 'lg:col-span-4 h-[200px]', 'lg:col-span-4 h-[200px]', 'lg:col-span-8 h-[240px]', 'lg:col-span-4 h-[240px]'];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-busy="true" aria-label="Yüklənir">
      <Skeleton className="h-24 lg:col-span-12" />
      {spans.map((c, i) => (
        <Skeleton key={i} className={cn('rounded-3xl', c)} />
      ))}
    </div>
  );
}

/* ─────────── screen ─────────── */

export function DashboardScreen() {
  const { user } = useAuth();
  const summary = useMeSummary();
  const quests = useQuests();
  const assignments = useMyAssignments();
  const s = summary.data;
  const dueSoon = (assignments.data ?? []).filter((a) => !a.done && a.dueAt && +new Date(a.dueAt) - Date.now() < 3 * 86400_000).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Greeting name={user?.name} summary={s} dueSoon={dueSoon} />

      {summary.isLoading ? (
        <DashboardSkeleton />
      ) : summary.isError || !s ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} title="Baza düşərgəsi yüklənmədi" />
      ) : (
        <>
          <StatsStrip s={s} />
          <Stagger inView={false} stagger={0.06} className="grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
            <StaggerItem className="md:col-span-3 lg:col-span-4 lg:row-span-2">
              <Panel
                eyebrow="Altimetr"
                title="Səviyyə"
                accent="yüksəkliyi"
                action={{ href: '/profile', label: 'Profil' }}
                decor={<ContourField seed={`alt-${user?.id ?? 'x'}`} x={0.95} y={0.05} rings={8} className="opacity-60" />}
              >
                <Altimeter xp={s.xp} level={s.level} progress={s.levelProgress} nextLevelXp={s.nextLevelXp} />
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-6 lg:col-span-8">
              <Panel>
                <ActivityHeatmap activity={s.activity ?? []} />
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-3 lg:col-span-4">
              <Panel className="bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_oklab,var(--ember)_14%,transparent),transparent_60%)]">
                <StreakFlame streak={s.streak} activity={s.activity} />
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-3 lg:col-span-4">
              <Panel interactive glow="var(--aurora)">
                <DueCards count={s.cardsDue} />
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-6 lg:col-span-8">
              <Panel eyebrow="Davam et" title="Yarımçıq" accent="marşrutlar" action={{ href: '/courses', label: 'Hamısı' }}>
                <ContinueLearning />
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-6 lg:col-span-4 lg:row-span-2">
              <Panel eyebrow="Ekspedisiya tapşırıqları" title="Kvestlər" action={{ href: '/assignments', label: 'Tapşırıqlar' }}>
                {quests.isLoading ? (
                  <div className="space-y-2.5">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-[92px] rounded-2xl" />
                    ))}
                  </div>
                ) : quests.isError ? (
                  <ErrorState compact error={quests.error} onRetry={() => quests.refetch()} />
                ) : quests.data?.length ? (
                  <QuestList quests={quests.data} limit={6} />
                ) : (
                  <InlineEmpty icon={Target} title="Aktiv kvest yoxdur" hint="Yeni günlük və həftəlik kvestlər tezliklə açılacaq." />
                )}
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-3 lg:col-span-4">
              <Panel eyebrow="Yaxınlaşan son tarixlər" title="Tapşırıqlar" action={{ href: '/assignments', label: 'Hamısı' }}>
                {assignments.isLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : assignments.isError ? (
                  <ErrorState compact error={assignments.error} onRetry={() => assignments.refetch()} />
                ) : (
                  <AssignmentsDue items={assignments.data ?? []} />
                )}
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-3 lg:col-span-4">
              <Panel eyebrow="Diqqət tələb edir" title="Zəif" accent="mövzular">
                <WeakTopics topics={s.weakTopics ?? []} />
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-6 lg:col-span-7">
              <Panel eyebrow="Jurnal" title="Son" accent="cəhdlər" action={{ href: '/quizzes', label: 'Testlər' }}>
                <RecentAttempts attempts={s.recentAttempts ?? []} />
              </Panel>
            </StaggerItem>

            <StaggerItem className="md:col-span-6 lg:col-span-5">
              <Panel eyebrow="Bu həftə" title="Zirvəyə" accent="yarış" action={{ href: '/leaderboard', label: 'Reytinq' }}>
                <MiniLeaderboard meId={user?.id} />
              </Panel>
            </StaggerItem>
          </Stagger>
        </>
      )}
    </div>
  );
}
