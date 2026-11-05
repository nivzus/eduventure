'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Check, Sparkles, Target } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { Mascot } from '@/components/brand/Mascot';
import { Highlight, Note } from '@/components/notebook';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSmartPractice, useWeakTopics } from '../../hooks';

const COUNTS = [5, 10, 15];

function tone(acc: number) {
  if (acc < 50) return { bar: 'bg-danger', text: 'text-danger', label: 'zəif' };
  if (acc < 75) return { bar: 'bg-ember', text: 'text-signal', label: 'orta' };
  return { bar: 'bg-moss', text: 'text-moss', label: 'yaxşı' };
}

export function PracticeScreen() {
  const router = useRouter();
  const { data, isLoading } = useWeakTopics();
  const start = useSmartPractice();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(10);

  const topics = [...(data ?? [])].sort((a, b) => a.accuracy - b.accuracy);
  const toggle = (tag: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(tag)) n.delete(tag);
      else n.add(tag);
      return n;
    });

  const go = async () => {
    try {
      const bundle = await start.mutateAsync({ tags: picked.size ? [...picked] : undefined, count });
      router.push(`/attempts/${bundle.attempt.id}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Məşq üçün sual tapılmadı. Əvvəlcə bir neçə test həll et.'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <Note className="text-2xl !text-signal">səhvlər — müəllimdir</Note>
      <h1 className="mt-1 text-4xl leading-tight sm:text-6xl">
        Ağıllı <Highlight inView={false} delay={0.3}>məşq</Highlight>
      </h1>
      <p className="mt-3 max-w-xl text-lg text-muted">
        Səhv etdiyin suallardan sənə xüsusi məşq qururuq. Mövzu seç və ya hamısını birlikdə təkrarla.
      </p>

      <section className="paper-ruled relative mt-8 rounded-3xl border-2 border-ink bg-elev p-6 pl-14 shadow-[6px_6px_0_0_var(--ink)] sm:p-8 sm:pl-20">
        <div className="flex items-center gap-2">
          <Target className="size-5 text-signal" />
          <h2 className="text-2xl">Zəif mövzular</h2>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
        ) : topics.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <Mascot mode="celebrate" size={100} message="Zəif mövzu tapılmadı!" />
            <p className="max-w-sm text-muted">Bir neçə test həll et — sistem səhvlərini yadda saxlayıb burada göstərəcək.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {topics.map((t, i) => {
              const acc = Math.round(t.accuracy);
              const c = tone(acc);
              const on = picked.has(t.tag);
              return (
                <motion.li key={t.tag} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <button
                    type="button"
                    onClick={() => toggle(t.tag)}
                    aria-pressed={on}
                    className={cn(
                      'flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 px-4 py-3 text-left transition-colors sm:flex-nowrap',
                      on ? 'border-ink bg-ember/25' : 'border-line bg-bg/40 hover:border-ink/40',
                    )}
                  >
                    <span className={cn('grid size-6 shrink-0 place-items-center rounded-md border-2 border-ink', on ? 'bg-signal text-signal-fg' : 'bg-elev')}>
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-display text-lg font-semibold sm:w-44 sm:flex-none">#{t.tag}</span>
                    <span className="relative order-last h-4 basis-full overflow-hidden rounded-full border-2 border-ink bg-elev sm:order-none sm:basis-auto sm:flex-1">
                      <motion.span
                        className={cn('absolute inset-y-0 left-0 rounded-full', c.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${acc}%` }}
                        transition={{ delay: 0.2 + i * 0.05, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </span>
                    <span className={cn('w-14 shrink-0 text-right font-display text-lg font-bold tabular-nums', c.text)}>{acc}%</span>
                    <span className="hand hidden w-24 shrink-0 text-lg text-muted sm:block">{t.total} sual · {c.label}</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t-2 border-dashed border-line-strong pt-6">
          <div className="flex items-center gap-2">
            <span className="hand text-xl text-muted">sual sayı:</span>
            {COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={cn('h-9 min-w-11 rounded-xl border-2 px-2 font-display font-semibold', count === n ? 'border-ink bg-signal text-signal-fg shadow-stamp-sm' : 'border-line-strong bg-elev')}
              >
                {n}
              </button>
            ))}
          </div>
          <Button size="lg" magnetic leftIcon={<Sparkles />} loading={start.isPending} onClick={go} className="ml-auto">
            {picked.size ? `${picked.size} mövzu üzrə başla` : 'Hamısını məşq et'}
          </Button>
        </div>
      </section>
    </div>
  );
}
