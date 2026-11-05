'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { CalendarClock, Layers, Play } from 'lucide-react';
import { ButtonLink, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Note, Stamp } from '@/components/notebook';
import { useDeck } from '../hooks';
import { cardCountOf } from './DecksScreen';

export function DeckScreen({ id }: { id: string }) {
  const { data: deck, isLoading, isError } = useDeck(id);

  if (isLoading) return <div className="mx-auto max-w-5xl px-4 py-10"><Skeleton className="h-64 rounded-3xl" /></div>;
  if (isError || !deck) {
    return (
      <div className="grid place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={110} />
        <h1 className="mt-6 text-3xl">Kart dəsti tapılmadı</h1>
        <ButtonLink href="/decks" className="mt-6">Bütün dəstlər</ButtonLink>
      </div>
    );
  }

  const cards = deck.cards ?? [];
  const now = Date.now();
  const due = deck.dueCount ?? cards.filter((c) => !c.review || new Date(c.review.dueAt).getTime() <= now).length;
  const learned = cards.filter((c) => (c.review?.repetitions ?? 0) >= 2).length;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <Link href="/decks" className="hand text-xl text-muted hover:text-fg">← bütün dəstlər</Link>
      <section className="paper-ruled relative mt-4 rounded-3xl border-2 border-ink bg-elev p-6 pl-14 shadow-[6px_6px_0_0_var(--ink)] sm:p-10 sm:pl-20">
        <Note className="text-2xl !text-signal">{deck.category ?? 'kart dəsti'}</Note>
        <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">{deck.title}</h1>
        {deck.description && <p className="mt-3 max-w-xl text-lg text-muted">{deck.description}</p>}
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <span className="inline-flex items-center gap-2"><Layers className="size-4 text-signal" /> <b className="font-display text-base">{cardCountOf(deck)}</b> kart</span>
          <span className="inline-flex items-center gap-2"><CalendarClock className="size-4 text-signal" /> <b className="font-display text-base">{due}</b> bu gün</span>
          <span className="inline-flex items-center gap-2">✓ <b className="font-display text-base">{learned}</b> öyrənilib</span>
        </div>
        <div className="mt-8">
          <ButtonLink href={`/decks/${id}/study`} size="lg" magnetic leftIcon={<Play />}>
            {due > 0 ? `Təkrara başla · ${due}` : 'Yenə məşq et'}
          </ButtonLink>
        </div>
        {learned > 0 && learned === cards.length && (
          <Stamp inView={false} delay={0.5} tone="moss" className="absolute bottom-6 right-6 hidden text-[10px] sm:grid">Hamısı<br />öyrənilib</Stamp>
        )}
      </section>

      <h2 className="mt-12 text-2xl">Kartlar</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="rounded-2xl border border-line bg-elev p-4 shadow-paper"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-lg font-semibold">{c.front}</span>
              {c.review && <span className="font-mono text-[11px] text-subtle">{c.review.interval}g</span>}
            </div>
            <div className="hand mt-1 text-xl text-signal">{c.back}</div>
            {c.example && <p className="mt-2 text-sm italic text-muted">{c.example}</p>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
