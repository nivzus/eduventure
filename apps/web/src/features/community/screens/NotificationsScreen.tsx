'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Award, Bell, CheckCheck, ClipboardList, MessageCircle, PenLine, Sparkles, Trash2 } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Highlight, Note } from '@/components/notebook';
import { cn } from '@/lib/utils';
import { useClearNotifications, useMarkNotificationRead, useNotifications, useReadAllNotifications } from '../hooks';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { dayKey, relativeTime, toDate } from '../lib/format';
import type { NotificationItem } from '../types';

const ICONS: Record<string, typeof Bell> = {
  ASSIGNMENT: ClipboardList,
  GRADE: PenLine,
  GRADED: PenLine,
  REVIEW: PenLine,
  COMMENT: MessageCircle,
  REPLY: MessageCircle,
  ACHIEVEMENT: Award,
  QUEST: Sparkles,
  LEVEL_UP: Sparkles,
};

function dayLabel(key: string) {
  const today = dayKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === today) return 'Bu gün';
  if (key === dayKey(y)) return 'Dünən';
  const d = new Date(key);
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' });
}

export function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const readAll = useReadAllNotifications();
  const clear = useClearNotifications();
  const [confirm, setConfirm] = useState(false);

  const list = data ?? [];
  const unread = list.filter((n) => !n.readAt).length;
  const groups = useMemo(() => {
    const m = new Map<string, NotificationItem[]>();
    [...list]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .forEach((n) => {
        const k = dayKey(toDate(n.createdAt) ?? new Date());
        m.set(k, [...(m.get(k) ?? []), n]);
      });
    return [...m.entries()];
  }, [list]);

  const open = (n: NotificationItem) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Note className="text-2xl !text-signal">poçt qutusu</Note>
          <h1 className="mt-1 text-4xl sm:text-6xl"><Highlight inView={false} delay={0.3}>Bildirişlər</Highlight></h1>
          <p className="hand mt-2 text-2xl text-muted">{unread ? `${unread} oxunmamış` : 'hamısı oxunub'}</p>
        </div>
        {list.length > 0 && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<CheckCheck />} disabled={!unread} loading={readAll.isPending} onClick={() => readAll.mutate()}>Hamısını oxu</Button>
            <Button variant="ghost" size="sm" leftIcon={<Trash2 />} onClick={() => setConfirm(true)}>Təmizlə</Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Mascot mode="static" size={120} message="Poçt boşdur" />
          <p className="mt-4 text-muted">Tapşırıqlar, qiymətlər və nailiyyətlər burada görünəcək.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="hand text-2xl text-muted">{dayLabel(day)}</h2>
              <ul className="mt-3 space-y-3">
                <AnimatePresence initial={false}>
                  {items.map((n, i) => {
                    const Icon = ICONS[n.type] ?? Bell;
                    const isNew = !n.readAt;
                    return (
                      <motion.li key={n.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: Math.min(i * 0.03, 0.2) }}>
                        <button
                          type="button"
                          onClick={() => open(n)}
                          className={cn(
                            'relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left shadow-paper transition-colors',
                            isNew ? 'border-2 border-ink bg-elev' : 'border-line bg-elev/60 hover:border-ink/40',
                          )}
                        >
                          <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink', isNew ? 'bg-signal text-signal-fg' : 'bg-sunken text-muted')}>
                            <Icon className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block font-display text-lg leading-snug', isNew ? 'font-bold' : 'font-semibold text-muted')}>{n.title}</span>
                            {n.body && <span className="mt-0.5 block text-[15px] text-muted">{n.body}</span>}
                            <span className="mt-1 block font-mono text-xs text-subtle">{relativeTime(n.createdAt)}</span>
                          </span>
                          {isNew && <span className="absolute right-4 top-4 size-2.5 rounded-full bg-signal" aria-label="oxunmamış" />}
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => clear.mutate(undefined, { onSuccess: () => setConfirm(false) })}
        title="Bütün bildirişlər silinsin?"
        description="Bu əməliyyatı geri qaytarmaq olmaz."
        confirmLabel="Sil"
        loading={clear.isPending}
      />
    </div>
  );
}
