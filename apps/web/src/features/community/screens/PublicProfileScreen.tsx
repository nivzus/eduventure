'use client';

import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import { Avatar, ButtonLink, Skeleton } from '@/components/ui';
import { NumberTicker } from '@/components/motion';
import { AchievementBadge } from '@/components/brand/AchievementBadge';
import { Mascot } from '@/components/brand/Mascot';
import { Note, Tape } from '@/components/notebook';
import { useAuth } from '@/lib/auth';
import { usePublicProfile } from '../hooks';

const ROLE: Record<string, string> = { STUDENT: 'Tələbə', TEACHER: 'Müəllim', ADMIN: 'Admin' };

export function PublicProfileScreen({ id }: { id: string }) {
  const { user: me } = useAuth();
  const { data, isLoading, isError } = usePublicProfile(id);

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="h-64 rounded-3xl" /></div>;
  if (isError || !data?.user) {
    return (
      <div className="grid place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={110} />
        <h1 className="mt-6 text-3xl">Profil tapılmadı</h1>
        <ButtonLink href="/leaderboard" className="mt-6">Liderlərə qayıt</ButtonLink>
      </div>
    );
  }

  const { user, stats } = data;
  const unlocked = data.achievements.filter((a) => a.unlockedAt !== null);
  const isMe = me?.id === user.id;
  const tiles = [
    { label: 'səviyyə', value: user.level ?? 1, cls: 'bg-aurora/10 text-aurora' },
    { label: 'XP', value: user.xp ?? 0, cls: 'bg-ember/25' },
    { label: 'testlər', value: stats.quizzesTaken ?? 0, cls: 'bg-elev' },
    { label: 'orta nəticə', value: Math.round(stats.avgPercent ?? 0), suffix: '%', cls: 'bg-elev' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border-2 border-ink bg-elev shadow-[6px_6px_0_0_var(--ink)]"
      >
        <div className="flex items-center justify-between border-b-2 border-dashed border-line-strong bg-sunken px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-subtle">
          <span>Səyyah pasportu</span>
          {stats.rank ? <span>Reytinq #{stats.rank}</span> : null}
        </div>
        <div className="flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
          <div className="relative rotate-[-3deg] bg-white p-2 pb-6 shadow-paper dark:bg-[#efe6d8]">
            <Tape color="aurora" className="-top-3 left-1/2 -translate-x-1/2 !w-16" rotate={-4} />
            <Avatar name={user.name} src={user.avatarUrl ?? undefined} size={110} className="!rounded-none" />
          </div>
          <div className="min-w-0 flex-1">
            <Note className="text-2xl !text-signal">{ROLE[user.role ?? 'STUDENT']}</Note>
            <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">{user.name}</h1>
            {user.bio && <p className="mt-2 max-w-md text-muted">{user.bio}</p>}
            <div className="mt-3 inline-flex items-center gap-1.5 font-display font-semibold"><Flame className="size-5 text-signal" /> {user.streak ?? 0} günlük seriya</div>
            {isMe && <div className="mt-4"><ButtonLink href="/profile" size="sm" variant="secondary">Profilimi redaktə et</ButtonLink></div>}
          </div>
        </div>
      </motion.section>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className={`rounded-2xl border-2 border-ink p-4 ${t.cls}`}>
            <div className="mono-label">{t.label}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums"><NumberTicker value={t.value} />{t.suffix}</div>
          </motion.div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-3xl">Nişanlar <span className="hand text-2xl text-muted">· {unlocked.length}</span></h2>
        {unlocked.length === 0 ? (
          <p className="mt-4 text-muted">Hələ nişan yoxdur — hər şey qabaqdadır!</p>
        ) : (
          <div className="paper-dots mt-5 grid grid-cols-2 gap-5 rounded-3xl border-2 border-dashed border-line-strong p-5 sm:grid-cols-3 lg:grid-cols-4">
            {unlocked.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ scale: 1.5, opacity: 0, rotate: -12 }}
                whileInView={{ scale: 1, opacity: 1, rotate: (i % 3) * 3 - 3 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 420, damping: 18, delay: Math.min(i * 0.05, 0.4) }}
                className="flex flex-col items-center rounded-2xl bg-elev p-3 text-center shadow-paper"
              >
                <AchievementBadge icon={a.icon} size="sm" title={a.title} />
                <div className="mt-2 font-display font-semibold leading-tight">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted">{a.description}</div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
