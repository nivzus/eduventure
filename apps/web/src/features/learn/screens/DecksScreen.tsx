'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Layers, Play } from 'lucide-react';
import { ButtonLink, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Highlight, Note } from '@/components/notebook';
import { useDecks } from '../hooks';
import type { Deck } from '../types';

const TILTS = [-2, 1.5, -1, 2, -1.5, 1];
const TAPES = ['bg-ember/70', 'bg-aurora/35', 'bg-moss/40', 'bg-glacier/40'];

export function cardCountOf(d: Deck) {
  return d.cardCount ?? d._count?.cards ?? d.cards?.length ?? 0;
}

export function DecksScreen() {
  const { data, isLoading } = useDecks();
  const decks = data ?? [];
  const due = decks.reduce((s, d) => s + (d.dueCount ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <Note className="text-2xl !text-signal">kartotek</Note>
      <h1 className="mt-1 text-4xl sm:text-6xl">
        Fləş<Highlight inView={false} delay={0.3}>kartlar</Highlight>
      </h1>
      <p className="mt-3 max-w-xl text-lg text-muted">
        Söz unudulmazdan bir az əvvəl qayıdır. {due > 0 ? <b className="text-fg">Bu gün {due} kart səni gözləyir.</b> : 'Bu gün üçün hər şey təkrarlanıb.'}
      </p>

      {isLoading ? (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}
        </div>
      ) : decks.length === 0 ? (
        <div className="mt-16 grid place-items-center text-center">
          <Mascot mode="static" size={120} message="Hələ kart dəsti yoxdur" />
        </div>
      ) : (
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: TILTS[i % TILTS.length] }}
              whileHover={{ rotate: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20, delay: i * 0.05 }}
              className="group relative"
            >
              {/* stacked index cards behind */}
              <div className="absolute inset-0 translate-x-2 translate-y-2 rotate-[3deg] rounded-2xl border border-line bg-elev shadow-paper" />
              <div className="absolute inset-0 translate-x-1 translate-y-1 rotate-[1.5deg] rounded-2xl border border-line bg-elev" />
              <Link href={`/decks/${d.id}`} className="paper-ruled relative block rounded-2xl border-2 border-ink bg-elev p-6 pl-14 shadow-stamp">
                <span className={`absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-3 ${TAPES[i % TAPES.length]}`} />
                <div className="flex items-center justify-between">
                  <span className="hand text-xl text-muted">{d.category ?? 'lüğət'}</span>
                  {(d.dueCount ?? 0) > 0 && (
                    <span className="rounded-full border-2 border-ink bg-signal px-2.5 py-0.5 text-xs font-bold text-signal-fg">{d.dueCount} təkrar</span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl leading-tight">{d.title}</h2>
                {d.description && <p className="mt-2 line-clamp-2 text-muted">{d.description}</p>}
                <div className="mt-6 flex items-center gap-2 text-sm text-subtle">
                  <Layers className="size-4" /> {cardCountOf(d)} kart
                </div>
              </Link>
              <div className="absolute -bottom-5 right-5">
                <ButtonLink href={`/decks/${d.id}/study`} size="sm" leftIcon={<Play />}>Öyrən</ButtonLink>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
