'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Gift, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { fireConfetti } from '@/components/motion';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn, formatNumber } from '@/lib/utils';
import { useClaimQuest } from '../../hooks';
import { PERIOD_LABEL, questMeta } from '../../lib/content';
import { questState } from '../../lib/normalize';
import type { QuestView } from '../../types';
import { ClaimBurst } from '../shared/ClaimBurst';

const EASE = [0.22, 1, 0.36, 1] as const;

function QuestRow({ quest, index }: { quest: QuestView; index: number }) {
  const reduce = useReducedMotion();
  const claim = useClaimQuest();
  const { refetch } = useAuth();
  const [burst, setBurst] = useState<number | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const state = questState(quest);
  const meta = questMeta(quest.type);
  const Icon = meta.icon;
  const progress = Math.min(1, quest.progress / Math.max(1, quest.target));

  const onClaim = () =>
    claim.mutate(quest.id, {
      onSuccess: () => {
        setBurst(Date.now());
        const r = anchor.current?.getBoundingClientRect();
        if (!reduce)
          fireConfetti(
            r ? { kind: 'stars', particleCount: 36, origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight } } : {},
          );
        toast.success(`+${quest.xpReward} XP qazandınız — „${quest.title}"`);
        refetch();
        setTimeout(() => setBurst(null), 1600);
      },
      onError: (e) => toast.error(errorMessage(e, 'Mükafatı almaq alınmadı')),
    });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 * index, ease: EASE }}
      className={cn(
        'relative rounded-2xl border p-3.5 transition-colors',
        state === 'claimable' ? 'border-signal/40 bg-signal/[0.06]' : 'border-line bg-sunken/60',
        state === 'claimed' && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl border',
            state === 'claimed' ? 'border-moss/30 bg-moss/10 text-moss' : state === 'claimable' ? 'border-signal/40 bg-signal text-signal-fg' : 'border-line bg-elev text-aurora',
          )}
        >
          {state === 'claimed' ? <Check className="size-4" /> : <Icon className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={cn('truncate text-sm font-semibold', state === 'claimed' && 'line-through decoration-fg/30')}>{quest.title}</p>
            <Badge tone="neutral" mono className="h-5 px-2">
              {PERIOD_LABEL[quest.period] ?? quest.period}
            </Badge>
          </div>
          {quest.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{quest.description}</p>}
          <div className="mt-2.5 flex items-center gap-3">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.07]">
              <motion.div
                className={cn('absolute inset-y-0 left-0 rounded-full', state === 'claimed' ? 'bg-moss' : 'bg-aurora')}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.9, delay: 0.2 + index * 0.05, ease: EASE }}
              />
            </div>
            <span className="shrink-0 font-mono text-[11px] tabular text-subtle">
              {formatNumber(Math.min(quest.progress, quest.target))}/{formatNumber(quest.target)}
            </span>
          </div>
        </div>
        <div ref={anchor} className="relative flex shrink-0 flex-col items-end gap-2">
          <ClaimBurst burstKey={burst} amount={quest.xpReward} />
          <AnimatePresence mode="popLayout" initial={false}>
            {state === 'claimable' ? (
              <motion.div key="claim" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                <Button size="sm" leftIcon={<Gift />} loading={claim.isPending} onClick={onClaim} className="shadow-glow">
                  +{quest.xpReward} XP
                </Button>
              </motion.div>
            ) : state === 'claimed' ? (
              <motion.span key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-[11px] uppercase tracking-wider text-moss">
                Alındı
              </motion.span>
            ) : (
              <motion.span key="xp" className="inline-flex items-center gap-1 font-mono text-[11px] text-aurora">
                <Sparkles className="size-3" />+{quest.xpReward} XP
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
}

export function QuestList({ quests, limit }: { quests: QuestView[]; limit?: number }) {
  const order = { claimable: 0, progress: 1, claimed: 2 } as const;
  const sorted = [...quests].sort((a, b) => order[questState(a)] - order[questState(b)]);
  const list = limit ? sorted.slice(0, limit) : sorted;
  return (
    <ul className="space-y-2.5">
      {list.map((q, i) => (
        <QuestRow key={q.id} quest={q} index={i} />
      ))}
    </ul>
  );
}
