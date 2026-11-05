'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CornerDownRight, MessagesSquare, Reply, Send, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Avatar, Button, IconButton, Kbd, Skeleton, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useComments, useDeleteComment, usePostComment } from '../../hooks';
import { relativeTime } from '../../lib/format';
import { buildCommentTree, countComments } from '../../lib/normalize';
import type { CommentNode, CommentTarget } from '../../types';
import { ErrorState, InlineEmpty } from '../shared/States';

const EASE = [0.22, 1, 0.36, 1] as const;

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
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    try {
      await onSubmit(text);
      setBody('');
    } catch (err) {
      toast.error(errorMessage(err, 'Şərh göndərilmədi'));
    }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    if (e.key === 'Escape') onCancel?.();
  };
  return (
    <form onSubmit={submit} className="flex items-start gap-3">
      {!compact && <Avatar name={user?.name} src={user?.avatarUrl} size="md" className="mt-1 hidden sm:inline-flex" />}
      <div className="min-w-0 flex-1 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          autoGrow
          autoFocus={autoFocus}
          maxLength={4000}
          aria-label={placeholder}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="hidden items-center gap-1 text-xs text-subtle sm:inline-flex">
            <Kbd>⌘</Kbd>
            <Kbd>Enter</Kbd> göndərir
          </span>
          <div className="ml-auto flex gap-2">
            {onCancel && (
              <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                Ləğv et
              </Button>
            )}
            <Button type="submit" size="sm" leftIcon={<Send />} loading={pending} disabled={!body.trim()}>
              Göndər
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CommentItem({ c, depth, targetType, targetId }: { c: CommentNode; depth: number; targetType: CommentTarget; targetId: string }) {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [replying, setReplying] = useState(false);
  const post = usePostComment(targetType, targetId);
  const del = useDeleteComment(targetType, targetId);
  const canDelete = !!user && (user.id === c.userId || user.id === c.user?.id || user.role === 'ADMIN' || user.role === 'TEACHER');
  const replies = c.replies ?? c.children ?? [];

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative"
      id={`comment-${c.id}`}
    >
      <div className="flex gap-3">
        <Link href={`/u/${c.user?.id ?? c.userId}`} className="shrink-0 rounded-full">
          <Avatar name={c.user?.name} src={c.user?.avatarUrl} size={depth ? 'sm' : 'md'} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link href={`/u/${c.user?.id ?? c.userId}`} className="text-sm font-semibold hover:underline">
              {c.user?.name ?? 'İstifadəçi'}
            </Link>
            {c.user?.role && c.user.role !== 'STUDENT' && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-glacier">{c.user.role === 'ADMIN' ? 'Admin' : 'Müəllim'}</span>
            )}
            <span className="font-mono text-[11px] text-subtle" title={c.createdAt}>
              {relativeTime(c.createdAt)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg/90">{c.body}</p>
          <div className="mt-1.5 flex items-center gap-1">
            {depth < 2 && user && (
              <Button size="sm" variant="ghost" leftIcon={<Reply />} className="h-7 px-2 text-xs" onClick={() => setReplying((v) => !v)}>
                Cavab ver
              </Button>
            )}
            {canDelete && (
              <IconButton
                label="Şərhi sil"
                size="sm"
                variant="danger"
                icon={<Trash2 />}
                loading={del.isPending}
                onClick={() =>
                  del.mutate(c.id, {
                    onSuccess: () => toast.success('Şərh silindi'),
                    onError: (e) => toast.error(errorMessage(e)),
                  })
                }
              />
            )}
          </div>
          <AnimatePresence>
            {replying && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex gap-2 pt-3">
                  <CornerDownRight className="mt-3 size-4 shrink-0 text-subtle" />
                  <div className="flex-1">
                    <Composer
                      compact
                      autoFocus
                      pending={post.isPending}
                      placeholder={`${c.user?.name ?? ''} adlı istifadəçiyə cavab…`}
                      onCancel={() => setReplying(false)}
                      onSubmit={async (body) => {
                        await post.mutateAsync({ body, parentId: c.id });
                        setReplying(false);
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {replies.length > 0 && (
            <ul className="mt-4 space-y-4 border-l border-line pl-4 sm:pl-5">
              <AnimatePresence initial={false}>
                {replies.map((r) => (
                  <CommentItem key={r.id} c={r} depth={depth + 1} targetType={targetType} targetId={targetId} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function CommentThread({ targetType, targetId, title = 'Müzakirə', className }: { targetType: CommentTarget; targetId: string; title?: string; className?: string }) {
  const q = useComments(targetType, targetId);
  const post = usePostComment(targetType, targetId);
  const tree = useMemo(() => buildCommentTree(q.data ?? []), [q.data]);
  const total = useMemo(() => countComments(tree), [tree]);

  return (
    <section className={cn('space-y-6', className)} aria-label={title}>
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="mono-label">{q.data ? `${total} şərh` : ''}</span>
      </div>
      <Composer pending={post.isPending} placeholder="Fikrinizi, sualınızı yazın…" onSubmit={(body) => post.mutateAsync({ body })} />
      {q.isLoading ? (
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-12" />
              </div>
            </div>
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState compact error={q.error} onRetry={() => q.refetch()} />
      ) : tree.length === 0 ? (
        <InlineEmpty icon={MessagesSquare} title="Hələ şərh yoxdur" hint="Müzakirəni ilk siz başladın — sual verin və ya faydalı keçid paylaşın." />
      ) : (
        <ul className="space-y-6">
          <AnimatePresence initial={false}>
            {tree.map((c) => (
              <CommentItem key={c.id} c={c} depth={0} targetType={targetType} targetId={targetId} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
