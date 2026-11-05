'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, BookOpen, Brain, Flame, Layers, Route, Sparkles, Trophy, Users } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { KineticText, Marquee, NumberTicker, Reveal, Stagger, StaggerItem, TopoBackground, TrailPath } from '@/components/motion';
import { Logo, ThemeToggle } from '@/components/shell';
import { Mascot } from '@/components/brand/Mascot';

const SKILLS = ['Present Perfect', 'Phrasal Verbs', 'IELTS Reading', 'Conditionals', 'Listening', 'Vocabulary B2', 'Articles a/an/the', 'Passive Voice', 'Speaking', 'Reported Speech'];

const FEATURES = [
  { icon: Brain, title: 'Ağıllı məşq', text: 'Sistem zəif mövzularını tapır və səhvlərindən fərdi məşq qurur.', tone: 'text-signal', span: 'md:col-span-2' },
  { icon: Layers, title: 'Fləşkartlar', text: 'SM-2 intervallı təkrar: sözlər tam unudulmazdan əvvəl qayıdır.', tone: 'text-ember', span: '' },
  { icon: Route, title: 'Öyrənmə yolları', text: 'Kurslar xəritədə marşrut kimi — hər dayanacaq bir mərhələ.', tone: 'text-glacier', span: '' },
  { icon: BookOpen, title: 'Məqalələr', text: 'Qeydlər, vurğulamalar və oxu irəliləyişi ilə qrammatika dərsləri.', tone: 'text-aurora', span: '' },
  { icon: Trophy, title: 'XP, səviyyələr, tapşırıqlar', text: 'Hər gün seriya, həftəlik reytinq və nailiyyət medalları.', tone: 'text-signal', span: '' },
  { icon: Users, title: 'Qruplar və tapşırıqlar', text: 'Müəllim qrup yaradır, tapşırıq verir, irəliləyişi analitikada izləyir.', tone: 'text-moss', span: 'md:col-span-2' },
];

const STEPS = [
  { n: '01', title: 'Səviyyəni yoxla', text: 'Qısa test — haradan başlayacağını bilək.' },
  { n: '02', title: 'Marşrutu seç', text: 'Kurs və ya öyrənmə yolu: qrammatika, lüğət, IELTS.' },
  { n: '03', title: 'Hər gün addımla', text: 'Testlər, kartlar, məqalələr — hər addım XP gətirir.' },
  { n: '04', title: 'Zirvəyə çat', text: 'Sertifikat al və reytinqdə yüksəl.' },
];

export function Landing() {
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] });
  const yFloat = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const yFloat2 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const steps = useRef<HTMLElement>(null);
  const { scrollYProgress: stepsProgress } = useScroll({ target: steps, offset: ['start 80%', 'end 60%'] });

  return (
    <div className="relative overflow-x-clip">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-fg">İmkanlar</a>
            <a href="#how" className="hover:text-fg">Necə işləyir</a>
            <a href="#stats" className="hover:text-fg">Rəqəmlər</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden px-3 text-sm font-semibold text-muted hover:text-fg sm:block">Daxil ol</Link>
            <ButtonLink href="/register" size="sm">Başla</ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={hero} className="relative flex min-h-[100svh] items-center pt-16">
        <TopoBackground variant="summit" animated highlight intensity={1.1} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 size-[640px] -translate-x-1/2 rounded-full bg-signal/15 blur-[140px]" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-elev/70 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-signal" /> Eduventure 2.0 · müəllim Sədaqət Ağayeva
            </motion.span>
            <KineticText
              as="h1"
              text="İngilis dilini *macəra* kimi öyrən"
              className="mt-6 font-display text-[clamp(2.6rem,7.5vw,6.2rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
              accentClassName="text-signal"
            />
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-6 max-w-xl text-lg text-muted"
            >
              Testlər, kurslar, fləşkartlar və məqalələr bir marşrutda. Hər gün kiçik addım — hər həftə yeni zirvə.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <ButtonLink href="/register" size="lg" magnetic rightIcon={<ArrowRight />}>Pulsuz başla</ButtonLink>
              <ButtonLink href="/login" size="lg" variant="secondary">Hesabım var</ButtonLink>
            </motion.div>
          </div>

          {/* Floating UI fragments */}
          <div className="relative hidden h-[520px] lg:block">
            <motion.div style={{ y: yFloat }} className="absolute right-0 top-4 w-[300px] rounded-3xl border border-line-strong bg-elev/90 p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="mono-label">Sual 4 / 12</span>
                <span className="font-mono text-xs text-ember">02:41</span>
              </div>
              <p className="mt-3 font-display text-lg font-semibold leading-snug">She ___ in Baku since 2019.</p>
              <div className="mt-4 space-y-2 text-sm">
                {['lives', 'has lived', 'is living'].map((o, i) => (
                  <div key={o} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${i === 1 ? 'border-signal bg-signal/10 text-fg' : 'border-line text-muted'}`}>
                    <span className="grid size-6 place-items-center rounded-lg border border-current font-mono text-[11px]">{String.fromCharCode(65 + i)}</span>
                    {o}
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div style={{ y: yFloat2 }} className="absolute left-0 top-56 w-[230px] rounded-3xl border border-line-strong bg-elev/90 p-5 shadow-2xl backdrop-blur">
              <span className="mono-label">Hündürlük · XP</span>
              <div className="mt-2 font-display text-4xl font-semibold"><NumberTicker value={2480} /></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                <motion.div className="h-full rounded-full bg-signal" initial={{ width: 0 }} animate={{ width: '68%' }} transition={{ delay: 0.8, duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted"><Flame className="size-4 text-ember" /> 12 günlük seriya</div>
            </motion.div>
            <motion.div
              className="absolute bottom-0 right-10"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, type: 'spring', stiffness: 120, damping: 16 }}
            >
              <Mascot mode="peek" size={170} message="Bilik yolunda irəli!" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="border-y border-line bg-sunken py-6">
        <Marquee speed={40} fade>
          {SKILLS.map((s) => (
            <span key={s} className="flex items-center gap-6 font-display text-2xl font-medium tracking-[-0.02em] text-muted">
              {s} <Sparkles className="size-5 text-signal" />
            </span>
          ))}
        </Marquee>
      </section>

      {/* Features bento */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
        <Reveal>
          <span className="mono-label">02 — İmkanlar</span>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1] tracking-[-0.03em] sm:text-6xl">
            Öyrənmək üçün hər şey — <span className="serif-accent text-signal">bir</span> düşərgədə
          </h2>
        </Reveal>
        <Stagger className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className={f.span}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-line bg-elev p-7 transition-colors hover:border-line-strong">
                <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-signal/0 blur-3xl transition-colors duration-700 group-hover:bg-signal/10" />
                <f.icon className={`size-7 ${f.tone}`} />
                <h3 className="mt-8 font-display text-xl font-semibold tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-2 max-w-md text-muted">{f.text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* How it works — trail */}
      <section id="how" ref={steps} className="relative border-t border-line bg-sunken py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <span className="mono-label">03 — Necə işləyir</span>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
              Marşrut <span className="serif-accent text-signal">dörd</span> dayanacaqdan ibarətdir
            </h2>
          </Reveal>
          <div className="relative mt-16">
            <svg className="absolute inset-x-0 top-6 hidden h-4 w-full md:block" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden>
              <path d="M0 2 H100" stroke="var(--border-strong)" strokeWidth="0.3" strokeDasharray="1 1" />
              <motion.path d="M0 2 H100" stroke="var(--signal)" strokeWidth="0.5" style={{ pathLength: stepsProgress }} />
            </svg>
            <div className="grid gap-10 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.1}>
                  <div className="relative grid size-12 place-items-center rounded-full border border-signal/50 bg-bg font-mono text-sm text-signal">{s.n}</div>
                  <h3 className="mt-6 font-display text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="mx-auto grid max-w-7xl gap-px overflow-hidden px-4 py-24 sm:grid-cols-3 sm:px-6">
        {[
          { v: 1200, s: '+', l: 'test sualı' },
          { v: 48, s: '', l: 'qrammatika dərsi' },
          { v: 96, s: '%', l: 'tələbə məmnuniyyəti' },
        ].map((x) => (
          <Reveal key={x.l} className="border-t border-line py-8">
            <div className="font-display text-6xl font-semibold tracking-[-0.04em] sm:text-7xl">
              <NumberTicker value={x.v} />
              <span className="text-signal">{x.s}</span>
            </div>
            <p className="mt-2 mono-label">{x.l}</p>
          </Reveal>
        ))}
      </section>

      {/* CTA */}
      <section className="relative mx-4 mb-10 overflow-hidden rounded-[2rem] border border-line bg-elev sm:mx-6">
        <TrailPath
          className="absolute inset-0 h-full w-full opacity-60"
          viewBox="0 0 1200 400"
          points={[[0, 340], [220, 290], [420, 320], [640, 200], [860, 220], [1040, 90], [1200, 60]]}
          inView
          duration={2.2}
        />
        <div className="relative flex flex-col items-start gap-8 p-8 sm:p-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="max-w-2xl font-display text-4xl font-semibold leading-[1] tracking-[-0.03em] sm:text-5xl">
              Zirvəyə ilk addım — <span className="serif-accent text-signal">bu gün</span>
            </h2>
            <p className="mt-4 max-w-lg text-muted">Qeydiyyat bir dəqiqə çəkir. Pişiyimiz artıq səni gözləyir.</p>
            <div className="mt-8"><ButtonLink href="/register" size="lg" magnetic rightIcon={<ArrowRight />}>Hesab yarat</ButtonLink></div>
          </div>
          <Mascot mode="celebrate" size={180} />
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-subtle sm:flex-row sm:px-6">
        <Logo />
        <span>© {new Date().getFullYear()} Eduventure · müəllim Sədaqət Ağayeva</span>
      </footer>
    </div>
  );
}
