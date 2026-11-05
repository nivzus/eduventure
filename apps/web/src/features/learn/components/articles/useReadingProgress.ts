'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useMotionValueEvent, useScroll, useSpring, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fireConfetti } from '@/components/motion';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useSaveArticleProgress } from '../../hooks';

const SEND_EVERY_MS = 2500;
const MIN_DELTA = 5;
const COMPLETE_AT = 90;

/**
 * Tracks how far through the article body the reader has scrolled, syncs the high-water mark to
 * `PUT /articles/:id/progress` (throttled), and celebrates completion at 90% (sent as 100).
 */
export function useReadingProgress(opts: {
  articleId: string;
  bodyRef: React.RefObject<HTMLElement | null>;
  initialProgress: number;
  initiallyCompleted: boolean;
}): {
  progress: MotionValue<number>;
  smooth: MotionValue<number>;
  percent: number;
  completed: boolean;
  markComplete: () => void;
  completing: boolean;
} {
  const { articleId, bodyRef, initialProgress, initiallyCompleted } = opts;
  const { scrollYProgress } = useScroll({ target: bodyRef, offset: ['start 0.2', 'end end'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 });
  const save = useSaveArticleProgress(articleId);
  const auth = useAuth();
  const qc = useQueryClient();

  const [percent, setPercent] = useState(0);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const maxRef = useRef(initialProgress);
  const sentRef = useRef(initialProgress);
  const completedRef = useRef(initiallyCompleted);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);
  const flushRef = useRef<() => void>(() => {});
  const failures = useRef(0);

  // Reset when navigating between articles
  useEffect(() => {
    maxRef.current = initialProgress;
    sentRef.current = initialProgress;
    completedRef.current = initiallyCompleted;
    setCompleted(initiallyCompleted);
  }, [articleId, initialProgress, initiallyCompleted]);

  const send = useCallback(
    (value: number) => {
      if (inflight.current) return;
      inflight.current = true;
      const payload = value >= COMPLETE_AT ? 100 : value;
      save.mutate(payload, {
        onSuccess: (res) => {
          sentRef.current = Math.max(sentRef.current, res?.progress ?? payload);
          const nowDone = Boolean(res?.completed || res?.completedAt || payload === 100);
          if (nowDone && !completedRef.current) {
            completedRef.current = true;
            setCompleted(true);
            const xp = res?.xpGained ?? 0;
            toast.success(xp > 0 ? `Məqalə tamamlandı! +${xp} XP` : 'Məqalə tamamlandı!');
            if (xp > 0) {
              fireConfetti({ kind: 'summit' });
              auth.refetch?.();
              qc.invalidateQueries({ queryKey: ['me'] });
            }
          }
        },
        onError: () => {
          failures.current += 1;
        },
        onSettled: () => {
          inflight.current = false;
          if (failures.current >= 3) return;
          const pending = maxRef.current - sentRef.current >= MIN_DELTA || (maxRef.current >= COMPLETE_AT && !completedRef.current);
          if (pending && !timer.current) timer.current = setTimeout(() => flushRef.current(), 1500);
        },
      });
    },
    [save, auth, qc],
  );

  const flush = useCallback(() => {
    timer.current = null;
    const max = maxRef.current;
    const needsCompletion = max >= COMPLETE_AT && !completedRef.current;
    if (needsCompletion || max - sentRef.current >= MIN_DELTA) send(max);
  }, [send]);
  flushRef.current = flush;

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const pct = Math.round(Math.min(1, Math.max(0, v)) * 100);
    setPercent(pct);
    if (pct > maxRef.current) maxRef.current = pct;
    if (!timer.current) timer.current = setTimeout(flush, maxRef.current >= COMPLETE_AT ? 400 : SEND_EVERY_MS);
  });

  // Short articles that fit in the viewport: count as read after 20 s on page.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || completedRef.current) return;
    const t = setTimeout(() => {
      if (body.getBoundingClientRect().bottom <= window.innerHeight && !completedRef.current) {
        maxRef.current = 100;
        flush();
      }
    }, 20_000);
    return () => clearTimeout(t);
  }, [bodyRef, flush, articleId]);

  // Flush pending progress when leaving the page
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && maxRef.current - sentRef.current >= 1) send(maxRef.current);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (timer.current) clearTimeout(timer.current);
      if (maxRef.current - sentRef.current >= 1) send(maxRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const markComplete = useCallback(() => {
    maxRef.current = 100;
    send(100);
  }, [send]);

  return { progress: scrollYProgress, smooth, percent, completed, markComplete, completing: save.isPending };
}
