'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useUnreadCount } from '@/lib/hooks';
import type { Notification } from '@/lib/types';
import { cn, formatRelative } from '@/lib/utils';
import { IconButton } from '@/components/ui/IconButton';
import { Popover } from '@/components/ui/Popover';
import { Skeleton } from '@/components/ui/Skeleton';

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();
  const unread = useUnreadCount();
  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api.get<Notification[]>('/notifications'),
    enabled: open,
    staleTime: 15_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const count = unread.data ?? 0;
  const items = (list.data ?? []).slice(0, 8);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-[min(400px,calc(100vw-16px))]"
      trigger={<IconButton label="Bildirişlər" icon={<Bell />} badge={count > 0 ? count : undefined} />}
    >
      {(close) => (
        <div className="flex max-h-[min(560px,75vh)] flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="font-display text-base font-semibold">Bildirişlər</p>
              <p className="mono-label mt-1 !text-[14px]">{count > 0 ? `${count} oxunmamış` : 'hamısı oxunub'}</p>
            </div>
            <button
              type="button"
              disabled={count === 0 || readAll.isPending}
              onClick={() => readAll.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-fg/[0.06] hover:text-fg disabled:opacity-40"
            >
              <CheckCheck className="size-4" /> Hamısını oxu
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {list.isLoading ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="grid size-11 place-items-center rounded-2xl border border-line bg-surface text-subtle">
                  <BellOff className="size-5" />
                </span>
                <p className="font-semibold">Düşərgədə sakitlik</p>
                <p className="text-sm text-muted">Yeni bildiriş yoxdur. Testləri tamamladıqca burada xəbərlər görünəcək.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((n, i) => (
                  <motion.li key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.readAt) markRead.mutate(n.id);
                        if (n.link) {
                          close();
                          router.push(n.link);
                        }
                      }}
                      className={cn('flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-fg/[0.05]', !n.readAt && 'bg-fg/[0.025]')}
                    >
                      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-signal light:bg-ember')} />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm leading-snug', n.readAt ? 'text-muted' : 'font-semibold text-fg')}>{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{n.body}</span>}
                        <span className="mono-label mt-1.5 block !text-[14px]">{formatRelative(n.createdAt)}</span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/notifications"
            onClick={close}
            className="block border-t border-line px-5 py-3 text-center text-sm font-semibold text-muted transition hover:bg-fg/[0.04] hover:text-fg"
          >
            Hamısına bax
          </Link>
        </div>
      )}
    </Popover>
  );
}
