'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Camera, Flame, KeyRound, Pencil, Sparkles, Trophy } from 'lucide-react';
import { Avatar, Button, Field, Input, Modal, Skeleton, Textarea } from '@/components/ui';
import { NumberTicker } from '@/components/motion';
import { AchievementBadge } from '@/components/brand/AchievementBadge';
import { Highlight, Note, Tape } from '@/components/notebook';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAchievements, useChangePassword, useMeSummary, useUpdateMe, useUpload } from '../hooks';

const ROLE: Record<string, string> = { STUDENT: 'Tələbə', TEACHER: 'Müəllim', ADMIN: 'Admin' };

export function ProfileScreen() {
  const { user } = useAuth();
  const { data: s, isLoading } = useMeSummary();
  const { data: achievements } = useAchievements();
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  if (!user || isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  const list = achievements ?? [];
  const unlocked = list.filter((a) => a.unlockedAt);
  const stats = [
    { label: 'testlər', value: s?.quizzesTaken ?? 0 },
    { label: 'orta nəticə', value: Math.round(s?.avgPercent ?? 0), suffix: '%' },
    { label: 'məqalələr', value: s?.articlesRead ?? 0 },
    { label: 'kurslar', value: s?.coursesCompleted ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      {/* Passport */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border-2 border-ink bg-elev shadow-[6px_6px_0_0_var(--ink)]"
      >
        <div className="flex items-center justify-between border-b-2 border-dashed border-line-strong bg-sunken px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-subtle">
          <span>Səyyah pasportu<span className="hidden sm:inline"> · Eduventure</span></span>
          <span>№ {user.id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="relative mx-auto w-fit rotate-[-3deg] bg-white p-2 pb-6 shadow-paper dark:bg-[#efe6d8]">
            <Tape color="ember" className="-top-3 left-1/2 -translate-x-1/2 !w-16" rotate={4} />
            <Avatar name={user.name} src={user.avatarUrl ?? undefined} size={120} className="!rounded-none" />
          </div>
          <div className="text-center md:text-left">
            <Note className="text-2xl !text-signal">{ROLE[user.role] ?? 'Tələbə'}</Note>
            <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">{user.name}</h1>
            <p className="mt-2 max-w-md text-muted">{user.bio || 'Özün haqqında bir-iki cümlə yaz — profilin daha canlı olsun.'}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              <Button size="sm" variant="secondary" leftIcon={<Pencil />} onClick={() => setEditOpen(true)}>Redaktə et</Button>
              <Button size="sm" variant="ghost" leftIcon={<KeyRound />} onClick={() => setPwOpen(true)}>Şifrəni dəyiş</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 border-ink bg-aurora/10 px-4 py-2">
              <div className="hand text-lg text-muted">səviyyə</div>
              <div className="font-display text-3xl font-bold text-aurora">{s?.level ?? user.level}</div>
            </div>
            <div className="rounded-2xl border-2 border-ink bg-ember/25 px-4 py-2">
              <div className="hand text-lg text-muted">XP</div>
              <div className="font-display text-3xl font-bold"><NumberTicker value={s?.xp ?? user.xp} /></div>
            </div>
            <div className="rounded-2xl border-2 border-ink bg-signal/10 px-4 py-2">
              <div className="hand text-lg text-muted">seriya</div>
              <div className="inline-flex items-center gap-1 font-display text-3xl font-bold"><Flame className="size-6 text-signal" />{s?.streak ?? user.streak}</div>
            </div>
            <div className="rounded-2xl border-2 border-ink bg-moss/10 px-4 py-2">
              <div className="hand text-lg text-muted">reytinq</div>
              <div className="font-display text-3xl font-bold">{s?.rank ? `#${s.rank}` : '—'}</div>
            </div>
          </div>
        </div>
        {/* level progress */}
        <div className="px-6 pb-6 sm:px-8">
          <div className="flex justify-between text-sm text-muted">
            <span>Səviyyə {s?.level ?? 1}</span>
            <span>növbəti zirvəyə {Math.max(0, (s?.nextLevelXp ?? 0) - (s?.xp ?? 0))} XP</span>
          </div>
          <div className="mt-1.5 h-4 overflow-hidden rounded-full border-2 border-ink bg-sunken">
            <motion.div className="h-full bg-signal" initial={{ width: 0 }} animate={{ width: `${Math.round((s?.levelProgress ?? 0) * 100)}%` }} transition={{ delay: 0.3, duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((x, i) => (
          <motion.div key={x.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }} className="rounded-2xl border border-line bg-elev p-4 shadow-paper">
            <div className="mono-label">{x.label}</div>
            <div className="mt-1 font-display text-4xl font-bold tabular-nums"><NumberTicker value={x.value} />{x.suffix}</div>
          </motion.div>
        ))}
      </section>

      {/* Sticker album */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl">
            Nişan <Highlight>albomu</Highlight>
          </h2>
          <span className="hand text-2xl text-muted">{unlocked.length} / {list.length} toplanıb</span>
        </div>
        <div className="paper-dots mt-6 grid grid-cols-2 gap-5 rounded-3xl border-2 border-dashed border-line-strong p-5 sm:grid-cols-3 lg:grid-cols-4">
          {list.length === 0 && <p className="col-span-full py-8 text-center text-muted">Nişanlar tezliklə burada görünəcək.</p>}
          {list.map((a, i) => {
            const got = Boolean(a.unlockedAt);
            return (
              <motion.div
                key={a.id}
                initial={got ? { scale: 1.6, opacity: 0, rotate: -15 } : { opacity: 0 }}
                whileInView={got ? { scale: 1, opacity: 1, rotate: (i % 3) * 3 - 3 } : { opacity: 1 }}
                viewport={{ once: true }}
                transition={got ? { type: 'spring', stiffness: 420, damping: 18, delay: Math.min(i * 0.05, 0.4) } : { delay: 0.1 }}
                className={cn('flex flex-col items-center rounded-2xl p-3 text-center', got ? 'bg-elev shadow-paper' : 'border-2 border-dashed border-line-strong opacity-70')}
              >
                <AchievementBadge icon={a.icon} locked={!got} size="sm" title={a.title} />
                <div className="mt-2 font-display font-semibold leading-tight">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted">{a.description}</div>
                <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-signal"><Sparkles className="size-3" /> +{a.xpReward} XP</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recent */}
      {(s?.recentAttempts?.length ?? 0) > 0 && (
        <section className="mt-12">
          <h2 className="text-3xl">Son cəhdlər</h2>
          <ul className="mt-5 grid gap-2.5">
            {s!.recentAttempts.slice(0, 6).map((a) => (
              <li key={a.id}>
                <a href={`/attempts/${a.id}/result`} className="flex items-center gap-4 rounded-2xl border border-line bg-elev px-4 py-3 shadow-paper hover:border-ink/50">
                  <Trophy className={cn('size-5', a.passed ? 'text-moss' : 'text-subtle')} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{a.quiz?.title}</span>
                  <span className="font-display text-lg font-bold tabular-nums">{Math.round(a.percent)}%</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refetch } = useAuth();
  const update = useUpdateMe();
  const upload = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setBio(user.bio ?? '');
      setAvatarUrl(user.avatarUrl ?? null);
    }
  }, [open, user]);

  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error('Şəkil 5 MB-dan böyük olmamalıdır');
    try {
      const r = await upload.mutateAsync(f);
      setAvatarUrl(r.url);
    } catch (e) {
      toast.error(errorMessage(e, 'Şəkil yüklənmədi'));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error('Ad ən azı 2 simvol olmalıdır');
    try {
      await update.mutateAsync({ name: name.trim(), bio: bio.trim() || null, avatarUrl });
      await refetch();
      toast.success('Profil yeniləndi');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Profili redaktə et">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={name || user?.name || '?'} src={avatarUrl ?? undefined} size={64} />
          <Button type="button" variant="secondary" size="sm" leftIcon={<Camera />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
            Şəkil seç
          </Button>
          {avatarUrl && <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>Sil</Button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <Field label="Ad, soyad" htmlFor="pf-name">
          <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Haqqımda" htmlFor="pf-bio" hint="Qısa — 1–2 cümlə">
          <Textarea id="pf-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ləğv et</Button>
          <Button type="submit" loading={update.isPending}>Yadda saxla</Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');

  useEffect(() => {
    if (!open) {
      setCurrent('');
      setNext('');
      setRepeat('');
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error('Yeni şifrə ən azı 8 simvol olmalıdır');
    if (next !== repeat) return toast.error('Şifrələr üst-üstə düşmür');
    try {
      await change.mutateAsync({ current, next });
      toast.success('Şifrə dəyişdirildi');
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Cari şifrə yanlışdır'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Şifrəni dəyiş">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Cari şifrə" htmlFor="pw-cur"><Input id="pw-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="Yeni şifrə" htmlFor="pw-new" hint="Ən azı 8 simvol"><Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label="Yeni şifrə (təkrar)" htmlFor="pw-rep"><Input id="pw-rep" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ləğv et</Button>
          <Button type="submit" loading={change.isPending}>Dəyiş</Button>
        </div>
      </form>
    </Modal>
  );
}
