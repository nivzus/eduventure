'use client';

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Mountain, Users } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, PageHeader, Segmented, Select, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { cn, formatNumber } from '@/lib/utils';
import { useLeaderboard, useMyGroups } from '../hooks';
import type { LeaderboardPeriod } from '../types';
import { Podium } from '../components/leaderboard/Podium';
import { LeaderRow } from '../components/leaderboard/LeaderRow';
import { ErrorState } from '../components/shared/States';

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'Həftə' },
  { value: 'month', label: 'Ay' },
  { value: 'all', label: 'Bütün zamanlar' },
];

const PERIOD_EYEBROW: Record<LeaderboardPeriod, string> = {
  week: 'Son 7 gün',
  month: 'Son 30 gün',
  all: 'Ekspedisiyanın əvvəlindən',
};

export function LeaderboardScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [groupId, setGroupId] = useState('');
  const groups = useMyGroups();
  const lb = useLeaderboard(period, groupId || null);
  const list = lb.data ?? [];
  const max = list[0]?.xp ?? 1;
  const rest = list.slice(3, 100);
  const mine = list.find((e) => e.user.id === user?.id);
  const mineIdx = mine ? list.indexOf(mine) : -1;
  const ahead = mineIdx > 0 ? list[mineIdx - 1] : undefined;
  const mineVisible = mineIdx > -1 && mineIdx < 3;

  return (
    <div className="pb-28 lg:pb-10">
      <PageHeader
        eyebrow={`Reytinq · ${PERIOD_EYEBROW[period]}`}
        title={
          <>
            Zirvə <em>cədvəli</em>
          </>
        }
        description="XP təcrübə xalı hər test, məqalə və kart təkrarı ilə toplanır. Ən yüksək hündürlüyə kim qalxıb?"
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented tabs={PERIODS} value={period} onChange={setPeriod} aria-label="Dövr" className="self-start" />
        {(groups.data?.length ?? 0) > 0 && (
          <Select
            aria-label="Qrup"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            selectSize="sm"
            wrapperClassName="sm:w-64"
            options={[{ value: '', label: 'Bütün iştirakçılar' }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]}
          />
        )}
      </div>

      {lb.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[360px] rounded-3xl" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      ) : lb.isError ? (
        <ErrorState error={lb.error} onRetry={() => lb.refetch()} />
      ) : !list.length ? (
        <EmptyState
          icon={groupId ? Users : Mountain}
          title="Hələ heç kim yola çıxmayıb"
          description={groupId ? 'Bu qrupda seçilmiş dövr üçün XP qazanan yoxdur.' : 'Bu dövrdə hələ XP qazanılmayıb. İlk addımı siz atın!'}
        />
      ) : (
        <LayoutGroup>
          <div className={cn('transition-opacity duration-300', lb.isFetching && !lb.isLoading && 'opacity-60')}>
            <Podium entries={list} meId={user?.id} animKey={`${period}-${groupId}`} />

            <div className="mt-6 rounded-3xl border border-line bg-elev p-2 shadow-inner-hl sm:p-3">
              <div className="flex items-center justify-between px-3 pb-2 pt-2 sm:px-4">
                <span className="mono-label">Mövqe · İştirakçı</span>
                <span className="mono-label">XP</span>
              </div>
              {rest.length ? (
                <motion.ol layout className="space-y-1">
                  <AnimatePresence initial={false} mode="popLayout">
                    {rest.map((e, i) => (
                      <LeaderRow key={e.user.id} entry={e} max={max} me={e.user.id === user?.id} index={i} />
                    ))}
                  </AnimatePresence>
                </motion.ol>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-subtle">Zirvədə yalnız ilk üçlük var — növbəti yer sizi gözləyir.</p>
              )}
            </div>
          </div>
        </LayoutGroup>
      )}

      {/* my rank — sticky camp marker */}
      {!lb.isLoading && !lb.isError && list.length > 0 && !mineVisible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.6 }}
          className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-20 mt-4 lg:bottom-6"
        >
          <div className="glass flex items-center gap-4 rounded-2xl border border-signal/40 px-4 py-3 shadow-pop light:border-aurora/40">
            <span className="mono-label">Sizin mövqeyiniz</span>
            {mine ? (
              <>
                <span className="font-display text-2xl font-semibold">#{mine.rank}</span>
                <span className="ml-auto text-right">
                  <span className="font-display text-lg font-semibold">{formatNumber(mine.xp)}</span>
                  <span className="ml-1 font-mono text-[10px] text-subtle">XP</span>
                  {ahead && (
                    <span className="block font-mono text-[10px] text-subtle">
                      növbəti yerə {formatNumber(Math.max(1, ahead.xp - mine.xp + 1))} XP
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="ml-auto text-sm text-muted">Bu dövrdə hələ XP qazanmamısınız</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
