'use client';

import { CornerDownRight, MessageSquare, Send, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Avatar, Button, Skeleton, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useComments, useDeleteComment, usePostComment } from '../../hooks';
import { relativeTime } from '../../lib/format';
import type { CommentNode } from '../../types';

const EASE = [0.22, 1, 0.36, 1] as const;

function countAll(list: CommentNode[]): number {
  return list.reduce((n, c) => n + 1 + countAll(c.replies ?? c.children ?? []), 0);
}

function Composer({
  onSubmit,
  pending,
  placeholder,
  autoFocus,
  onCancel,
  compact,
}: {
  onSubmit: (body: string) => Promise<unknown>;
  pending: boolean;
  placeholder: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [body, setBody] = useState('');
  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    try {
      await onSubmit(text);
      setBody('');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <div className={cn('rounded-2xl border border-line bg-elev p-2 transition-colors focus-within:border-line-strong', compact && 'bg-surface')}>
      <Textarea
        value={body}
        autoFocus={autoFocus}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') onCancel?.();
        }}
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-1">
        <span className="hidden font-mono text-[10px] tracking-[0.14em] text-subtle uppercase sm:inline">⌘ + Enter — göndər</span>
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Ləğv et
            </Button>
          )}
          <Button size="sm" onClick={submit} loading={pending} disabled={!body.trim()} rightIcon={<Send className="size-3.5" />}>
            Göndər
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  c,
  depth,
  onReply,
  onDelete,
  canDelete,
  replyingTo,
  setReplyingTo,
  posting,
}: {
  c: CommentNode;
  depth: number;
  onReply: (body: string, parentId: string) => Promise<unknown>;
  onDelete: (id: string) => void;
  canDelete: (c: CommentNode) => boolean;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  posting: boolean;
}) {
  const replies = c.replies ?? c.children ?? [];
  const name = c.user?.name ?? 'İstifadəçi';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="list-none"
    >
      <div className="group flex gap-3">
        <Avatar name={name} src={c.user?.avatarUrl ?? undefined} size={depth ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{name}</span>
            {c.user?.role && c.user.role !== 'STUDENT' && (
              <span className="rounded-full border border-aurora/30 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em] text-aurora uppercase">
                {c.user.role === 'ADMIN' ? 'Admin' : 'Müəllim'}
              </span>
            )}
            <span className="font-mono text-[10px] tracking-[0.12em] text-subtle uppercase">{relativeTime(c.createdAt)}</span>
          </div>
          <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap text-fg/90">{c.body}</p>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-subtle">
            {depth < 3 && (
              <button
                type="button"
                onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-fg/5 hover:text-fg"
              >
                <CornerDownRight className="size-3.5" /> Cavab ver
              </button>
            )}
            {canDelete(c) && (
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-danger/10 hover:text-danger focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" /> Sil
              </button>
            )}
          </div>
          <AnimatePresence>
            {replyingTo === c.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <Composer
                    compact
                    autoFocus
                    pending={posting}
                    placeholder={`${name} adlı istifadəçiyə cavab…`}
                    onCancel={() => setReplyingTo(null)}
                    onSubmit={async (body) => {
                      await onReply(body, c.id);
                      setReplyingTo(null);
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {replies.length > 0 && (
            <ul className="mt-4 space-y-4 border-l border-line pl-4 md:pl-5">
              <AnimatePresence initial={false}>
                {replies.map((r) => (
                  <CommentItem
                    key={r.id}
                    c={r}
                    depth={depth + 1}
                    onReply={onReply}
                    onDelete={onDelete}
                    canDelete={canDelete}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    posting={posting}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/** Threaded discussion for ARTICLE / COURSE targets. */
export function Comments({ targetType, targetId, title = 'Müzakirə' }: { targetType: 'ARTICLE' | 'COURSE'; targetId: string; title?: string }) {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useComments(targetType, targetId);
  const post = usePostComment(targetType, targetId);
  const del = useDeleteComment(targetType, targetId);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const list = data ?? [];
  const total = countAll(list);
  const staff = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  return (
    <section id="comments" className="scroll-mt-28">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">
          {title} <span className="accent text-muted">({total})</span>
        </h2>
        <MessageSquare className="size-5 text-subtle" />
      </div>
      <Composer
        pending={post.isPending && !replyingTo}
        placeholder="Fikrini bölüş, sual ver…"
        onSubmit={(body) => post.mutateAsync({ body })}
      />
      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-5">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted">
            Şərhləri yükləmək alınmadı.{' '}
            <button type="button" className="underline" onClick={() => refetch()}>
              Yenidən cəhd et
            </button>
          </p>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
            Hələ heç kim yazmayıb. İlk fikri sən bildir.
          </p>
        ) : (
          <ul className="space-y-6">
            <AnimatePresence initial={false}>
              {list.map((c) => (
                <CommentItem
                  key={c.id}
                  c={c}
                  depth={0}
                  posting={post.isPending}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  canDelete={(x) => Boolean(user && (x.userId === user.id || staff))}
                  onReply={(body, parentId) => post.mutateAsync({ body, parentId })}
                  onDelete={(id) =>
                    del.mutate(id, {
                      onSuccess: () => toast.info('Şərh silindi'),
                      onError: (e) => toast.error(errorMessage(e)),
                    })
                  }
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
