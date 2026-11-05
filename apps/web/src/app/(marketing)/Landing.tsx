'use client';

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { ArrowRight, BookOpen, Brain, Flame, Layers, Plane, Route, Sparkles, Trophy, Users } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { NumberTicker, Reveal } from '@/components/motion';
import { ThemeToggle } from '@/components/shell';
import { Logo } from '@/components/shell';
import { BookCatMark, LogoCat, LogoLockup } from '@/components/brand/BookCat';
import { Mascot } from '@/components/brand/Mascot';
import { CircleMark, HandArrow, Highlight, Note, PaperScrap, Scribble, Stamp, Tape } from '@/components/notebook';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── data ───────────────────────── */

const WORDS = ['Present Perfect', 'phrasal verbs', 'IELTS Reading', 'Conditionals', 'listening', 'B2 vocabulary', 'a / an / the', 'Passive Voice', 'speaking', 'Reported Speech'];

const CHAPTERS: { icon: typeof Brain; title: string; text: string; note: string; stamp: string; tone: 'signal' | 'moss' | 'aurora' }[] = [
  { icon: Brain, title: 'Ağıllı məşq', text: 'Sistem səhvlərini yadda saxlayır, zəif mövzularını tapır və yalnız sənə lazım olan tapşırıqları qurur.', note: 'səhv = yeni dərs', stamp: 'Fərdi', tone: 'signal' },
  { icon: Layers, title: 'Fləşkartlar', text: 'SM-2 intervallı təkrar: söz tam unudulmazdan bir gün əvvəl qayıdır. Sürüşdür, çevir, yadda saxla.', note: 'gündə 10 dəqiqə', stamp: 'SM-2', tone: 'aurora' },
  { icon: Route, title: 'Öyrənmə yolları', text: 'Kurslar xəritədə marşrut kimidir. Hər dayanacaq — məqalə, test və ya kart dəsti.', note: 'A2 → B1 → B2', stamp: 'Marşrut', tone: 'moss' },
  { icon: BookOpen, title: 'Məqalələr və qeydlər', text: 'Qrammatika dərslərini oxu, vacib yerləri marker ilə qeyd et, kənarda öz qeydlərini yaz.', note: 'öz dəftərin kimi', stamp: 'Oxu', tone: 'signal' },
  { icon: Trophy, title: 'XP, seriyalar, nişanlar', text: 'Hər addım XP gətirir. Gündəlik tapşırıqlar, həftəlik reytinq və möhürlənmiş nailiyyətlər.', note: '12 günlük seriya!', stamp: 'Səviyyə ↑', tone: 'aurora' },
];

const STEPS = [
  { n: '1', title: 'Səviyyəni yoxla', text: 'Qısa test — haradan başlayacağımızı bilək.', stamp: 'Start' },
  { n: '2', title: 'Marşrutu seç', text: 'Qrammatika, lüğət, IELTS — sənin yolun.', stamp: 'Yol' },
  { n: '3', title: 'Hər gün addımla', text: 'Testlər, kartlar, məqalələr — hər addım XP.', stamp: 'XP' },
  { n: '4', title: 'Zirvəyə çat', text: 'Sertifikat al, reytinqdə yüksəl.', stamp: 'Zirvə' },
];

/* ───────────────────────── page ───────────────────────── */

export function Landing() {
  return (
    <div className="relative overflow-x-clip">
      <Header />
      <Hero />
      <TapeMarquee />
      <NotebookChapters />
      <RouteSection />
      <TeacherSection />
      <TicketCTA />
      <Footer />
    </div>
  );
}

/* ───────────────────────── header ───────────────────────── */

function Header() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useEffect(() => scrollY.on('change', (v) => setSolid(v > 24)), [scrollY]);
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${solid ? 'border-b border-line bg-bg/85 backdrop-blur-md' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 font-brand text-[15px] font-bold text-muted md:flex">
          <a href="#defter" className="transition-colors hover:text-fg">Dəftər</a>
          <a href="#marsrut" className="transition-colors hover:text-fg">Marşrut</a>
          <a href="#muellim" className="transition-colors hover:text-fg">Müəllim</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden px-3 font-display text-[15px] font-medium text-muted hover:text-fg sm:block">Daxil ol</Link>
          <ButtonLink href="/register" size="sm">Başla</ButtonLink>
        </div>
      </div>
    </header>
  );
}

/* ───────────────────────── hero ───────────────────────── */

function useParallax(depth: number, mx: MotionValue<number>, my: MotionValue<number>) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return { x, y };
}

function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 18 });
  const my = useSpring(myRaw, { stiffness: 60, damping: 18 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const driftSlow = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const onMove = (e: RPointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mxRaw.set((e.clientX - r.left) / r.width - 0.5);
    myRaw.set((e.clientY - r.top) / r.height - 0.5);
  };

  const p1 = useParallax(-28, mx, my);
  const p2 = useParallax(36, mx, my);
  const p3 = useParallax(-46, mx, my);
  const p4 = useParallax(22, mx, my);
  const book = useParallax(12, mx, my);

  return (
    <section ref={ref} onPointerMove={onMove} className="relative min-h-[100svh] overflow-hidden pt-[72px]">
      {/* ruled page band */}
      <div className="paper-ruled pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(180deg,black_55%,transparent)]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:min-h-[calc(100svh-72px)] lg:grid-cols-[1.1fr_1fr] lg:pt-0">
        {/* copy */}
        <div className="relative z-10 pl-0 lg:pl-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex items-end gap-2">
            <Note className="text-[26px] !text-signal" rotate={-4}>Sədaqət müəllimin dəftərindən</Note>
            <HandArrow className="mb-[-26px] h-10 w-16 rotate-[18deg] text-signal" inView={false} delay={0.5} />
          </motion.div>

          <h1 className="mt-6 font-display text-[clamp(2.9rem,7.6vw,6.4rem)] font-extrabold leading-[0.95] tracking-[-0.015em]">
            <WordRise delay={0.15}>İngilis dilini</WordRise>
            <br />
            <WordRise delay={0.3}>
              <Highlight inView={false} delay={1.05}>macəra</Highlight> kimi
            </WordRise>
            <br />
            <WordRise delay={0.45}>
              <Scribble inView={false} delay={1.35}>öyrən</Scribble>
              <span className="text-signal">.</span>
            </WordRise>
          </h1>

          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.7, ease: EASE }} className="mt-7 max-w-xl text-lg text-muted sm:text-xl">
            Testlər, kurslar, fləşkartlar və məqalələr — hamısı bir dəftərdə. Hər gün kiçik addım, hər həftə yeni səhifə.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7, ease: EASE }} className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href="/register" size="lg" magnetic rightIcon={<ArrowRight />}>Dəftərimi aç</ButtonLink>
            <ButtonLink href="/login" size="lg" variant="secondary">Hesabım var</ButtonLink>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            {[
              ['7', 'sual tipi'],
              ['SM-2', 'təkrar sistemi'],
              ['24/7', 'məşq'],
            ].map(([v, l]) => (
              <div key={l} className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold">{v}</span>
                <span className="hand text-xl text-muted">{l}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* art */}
        <div className="relative mx-auto aspect-square w-full max-w-[560px]">
          <motion.div style={{ x: book.x, y: book.y }} className="absolute inset-[12%]">
            <motion.div style={{ y: driftSlow }} className="h-full w-full">
              <BookCatMark animated idle delay={0.3} className="h-full w-full drop-shadow-[0_24px_30px_rgba(216,88,16,.18)]" title="Eduventure" />
            </motion.div>
          </motion.div>

          {/* taped quiz card */}
          <motion.div style={{ x: p1.x, y: p1.y }} className="absolute -left-2 bottom-[2%] w-[52%] sm:-left-8">
            <motion.div style={{ y: drift }} initial={{ opacity: 0, y: 30, rotate: -14 }} animate={{ opacity: 1, y: 0, rotate: -5 }} transition={{ delay: 1.6, type: 'spring', stiffness: 120, damping: 14 }}>
              <PaperScrap tape="ember" className="!p-4">
                <div className="flex items-center justify-between"><span className="hand text-lg text-muted">Sual 4 / 12</span><span className="font-mono text-xs text-signal">02:41</span></div>
                <p className="mt-1 font-display text-[15px] font-semibold leading-snug">She ___ in Baku since 2019.</p>
                <div className="mt-2.5 space-y-1.5 text-[13px]">
                  {['lives', 'has lived', 'is living'].map((o, i) => (
                    <div key={o} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${i === 1 ? 'border-ink bg-ember/30 font-semibold' : 'border-line text-muted'}`}>
                      <span className="grid size-4 place-items-center rounded border border-current text-[9px]">{i === 1 ? '✓' : ''}</span>
                      {o}
                    </div>
                  ))}
                </div>
              </PaperScrap>
            </motion.div>
          </motion.div>

          {/* flipping flashcard */}
          <motion.div style={{ x: p2.x, y: p2.y }} className="absolute -right-2 top-[0%] w-[34%] sm:-right-6">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.9, type: 'spring', stiffness: 140, damping: 14 }}>
              <FlipCard />
            </motion.div>
          </motion.div>

          {/* XP sticky note */}
          <motion.div style={{ x: p3.x, y: p3.y }} className="absolute -left-1 top-[2%] w-[38%] sm:-left-6">
            <motion.div style={{ y: drift }} initial={{ opacity: 0, y: 30, rotate: 12 }} animate={{ opacity: 1, y: 0, rotate: 4 }} transition={{ delay: 2.1, type: 'spring', stiffness: 120, damping: 14 }}>
              <div className="relative rounded-md bg-[#FFE7A8] p-4 text-[#3b2a12] shadow-paper dark:bg-[#5b4a22] dark:text-[#fbeccb]">
                <Tape color="aurora" className="-top-3 left-6" rotate={-8} />
                <div className="hand text-lg opacity-75">bu həftə</div>
                <div className="font-display text-3xl font-semibold">+<NumberTicker value={480} /> XP</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><Flame className="size-4 text-signal" /> 12 günlük seriya</div>
              </div>
            </motion.div>
          </motion.div>

          {/* stamp */}
          <motion.div style={{ x: p4.x, y: p4.y }} className="absolute bottom-[3%] right-[2%]">
            <Stamp inView={false} delay={2.5} rotate={-14} className="text-[10px]">
              Səviyyə<br />B1<br />✓
            </Stamp>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WordRise({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="-mt-[0.14em] inline-block overflow-hidden pb-[0.1em] pt-[0.14em] align-bottom">
      <motion.span className="inline-block" initial={reduce ? false : { y: '105%', rotate: 3 }} animate={{ y: 0, rotate: 0 }} transition={{ delay, duration: 0.9, ease: EASE }}>
        {children}
      </motion.span>
    </span>
  );
}

function FlipCard() {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setFlipped((f) => !f), 2800);
    return () => clearInterval(id);
  }, [reduce]);
  return (
    <div className="relative aspect-[4/5] [perspective:900px]" onMouseEnter={() => setFlipped((f) => !f)}>
      <motion.div className="relative h-full w-full [transform-style:preserve-3d]" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 90, damping: 14 }}>
        <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border-2 border-ink bg-elev p-4 shadow-stamp [backface-visibility:hidden]">
          <span className="hand text-lg text-muted">kart 3 / 20</span>
          <span className="font-display text-2xl font-semibold">borrow</span>
          <span className="hand text-base text-subtle">çevir →</span>
        </div>
        <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border-2 border-ink bg-signal p-4 text-signal-fg shadow-stamp [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="hand text-lg opacity-80">tərcümə</span>
          <span className="font-display text-xl font-semibold leading-tight">borc almaq</span>
          <span className="text-xs opacity-80">Can I borrow your pen?</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ───────────────────────── tape marquee ───────────────────────── */

function TapeMarquee() {
  return (
    <section className="relative z-10 -my-2 overflow-hidden py-6">
      <div className="-rotate-[1.6deg] border-y-2 border-ink bg-signal py-3 text-signal-fg shadow-stamp">
        <div className="flex w-max animate-marquee gap-10 [--marquee-duration:38s]">
          {[...WORDS, ...WORDS].map((w, i) => (
            <span key={i} className={`flex items-center gap-10 whitespace-nowrap ${i % 2 ? 'hand text-3xl' : 'font-display text-2xl font-semibold'}`}>
              {w} <Sparkles className="size-5 opacity-80" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── notebook chapters (scroll page-flip) ───────────────────────── */

function NotebookChapters() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });
  const n = CHAPTERS.length;

  return (
    <section id="defter" className="relative">
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <Reveal>
          <Note className="text-2xl !text-signal">fəsillər</Note>
          <h2 className="mt-2 max-w-3xl font-display text-4xl font-semibold leading-[1.02] sm:text-6xl">
            Dəftərin içində <Highlight>nə var?</Highlight>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-muted">Səhifələri çevir — aşağı sürüşdür.</p>
        </Reveal>
      </div>

      {/* desktop: real page-flip book */}
      <section ref={ref} className="relative hidden md:block" style={{ height: `${n * 85 + 60}vh` }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
          <div className="relative flex aspect-[1.55] w-full max-w-[1060px] [perspective:2400px]">
            {/* left page: contents */}
            <div className="relative h-full w-1/2 rounded-l-[22px] border-2 border-r-0 border-ink bg-elev shadow-paper paper-ruled">
              <div className="flex h-full flex-col p-10 pl-16">
                <span className="hand text-2xl text-signal">Mündəricat</span>
                <ol className="mt-6 space-y-3">
                  {CHAPTERS.map((c, i) => (
                    <TocRow key={c.title} i={i} n={n} progress={progress} title={c.title} />
                  ))}
                </ol>
                <div className="mt-auto flex items-end justify-between">
                  <span className="hand text-xl text-subtle">Eduventure · with Seda</span>
                  <LogoCat className="h-20 w-auto" />
                </div>
              </div>
            </div>
            {/* right page base */}
            <div className="relative h-full w-1/2 rounded-r-[22px] border-2 border-ink bg-elev shadow-paper paper-ruled">
              <div className="grid h-full place-items-center p-10 text-center">
                <div>
                  <Mascot mode="celebrate" size={130} />
                  <p className="mt-4 font-display text-2xl font-semibold">Hamısı səndə!</p>
                  <p className="hand text-2xl text-muted">indi isə — qeydiyyat</p>
                </div>
              </div>
            </div>
            {/* spine shadow */}
            <div className="pointer-events-none absolute inset-y-2 left-1/2 z-[300] w-10 -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(42,31,23,.18),transparent_70%)]" />
            {/* flipping pages */}
            {CHAPTERS.map((c, i) => (
              <FlipPage key={c.title} i={i} n={n} progress={progress} chapter={c} />
            ))}
          </div>
        </div>
      </section>

      {/* mobile: stacked pages */}
      <div className="mx-auto grid max-w-xl gap-6 px-4 py-12 md:hidden">
        {CHAPTERS.map((c, i) => (
          <Reveal key={c.title}>
            <div className="relative rounded-2xl border-2 border-ink bg-elev p-6 pl-14 shadow-stamp paper-ruled" style={{ rotate: `${i % 2 ? 1 : -1}deg` }}>
              <ChapterBody c={c} i={i} />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function TocRow({ i, n, progress, title }: { i: number; n: number; progress: MotionValue<number>; title: string }) {
  const active = useTransform(progress, [i / n, (i + 0.5) / n, (i + 1) / n], [0.35, 1, 1]);
  return (
    <motion.li style={{ opacity: active }} className="flex items-baseline gap-3 font-display text-lg font-medium">
      <span className="hand w-6 text-xl text-signal">{i + 1}.</span>
      {title}
      <span className="mx-2 flex-1 translate-y-[-4px] border-b-2 border-dotted border-line-strong" />
      <span className="font-mono text-sm text-subtle">{(i + 1) * 12}</span>
    </motion.li>
  );
}

function FlipPage({ i, n, progress, chapter }: { i: number; n: number; progress: MotionValue<number>; chapter: (typeof CHAPTERS)[number] }) {
  const start = i / n;
  const end = (i + 1) / n;
  const rotateY = useTransform(progress, [start, end], [0, -180]);
  const zIndex = useTransform(progress, (v) => (v < (start + end) / 2 ? 100 - i : 200 + i));
  const shade = useTransform(rotateY, [0, -90, -180], [0, 0.22, 0]);
  return (
    <motion.div
      className="absolute right-0 top-0 h-full w-1/2 [transform-style:preserve-3d]"
      style={{ rotateY, zIndex, transformOrigin: 'left center' }}
    >
      {/* front */}
      <div className="absolute inset-0 overflow-hidden rounded-r-[22px] border-2 border-ink bg-elev paper-ruled [backface-visibility:hidden]">
        <div className="h-full p-10 pl-16">
          <ChapterBody c={chapter} i={i} />
        </div>
        <motion.div className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: shade }} />
      </div>
      {/* back */}
      <div className="absolute inset-0 overflow-hidden rounded-l-[22px] border-2 border-ink bg-elev paper-ruled [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <div className="flex h-full flex-col justify-between p-10 pl-16">
          <span className="hand text-2xl text-muted">qeyd:</span>
          <p className="hand -rotate-2 text-4xl leading-tight text-fg">“{chapter.note}”</p>
          <div className="flex justify-end">
            <Stamp tone={chapter.tone} rotate={-10} className="text-[10px]">{chapter.stamp}</Stamp>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ChapterBody({ c, i }: { c: (typeof CHAPTERS)[number]; i: number }) {
  const Icon = c.icon;
  return (
    <div className="flex h-full flex-col">
      <span className="hand text-2xl text-signal">Fəsil {i + 1}</span>
      <div className="mt-5 grid size-14 place-items-center rounded-2xl border-2 border-ink bg-ember/40 shadow-stamp-sm">
        <Icon className="size-7" />
      </div>
      <h3 className="mt-6 font-display text-3xl font-semibold lg:text-4xl">{c.title}</h3>
      <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-muted">{c.text}</p>
      <div className="mt-auto pt-6">
        <Note className="text-2xl !text-signal" rotate={-2}>→ {c.note}</Note>
      </div>
    </div>
  );
}

/* ───────────────────────── route ───────────────────────── */

function RouteSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
  const draw = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  return (
    <section id="marsrut" ref={ref} className="relative bg-sunken py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <Note className="text-2xl !text-signal">marşrut</Note>
          <h2 className="mt-2 font-display text-4xl font-semibold sm:text-6xl">
            Dörd <CircleMark>dayanacaq</CircleMark> — bir zirvə
          </h2>
        </Reveal>

        <div className="relative mt-20">
          <svg className="absolute inset-x-0 top-0 hidden h-[140px] w-full md:block" viewBox="0 0 1000 140" preserveAspectRatio="none" aria-hidden>
            <path d="M40 90 C 160 10, 250 130, 375 70 S 600 10, 625 80 S 830 130, 960 40" stroke="var(--border-strong)" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" fill="none" />
            <motion.path d="M40 90 C 160 10, 250 130, 375 70 S 600 10, 625 80 S 830 130, 960 40" stroke="var(--signal)" strokeWidth="4" strokeLinecap="round" fill="none" style={{ pathLength: draw }} />
          </svg>
          <div className="relative grid gap-12 md:grid-cols-4 md:pt-28">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <div className="relative">
                  <Stamp rotate={i % 2 ? 10 : -10} delay={0.2 + i * 0.15} tone={i === 3 ? 'moss' : 'signal'} className="size-[84px] bg-bg/50 text-[10px]">
                    {s.stamp}
                    <br />
                    <span className="text-lg">{s.n}</span>
                  </Stamp>
                  <h3 className="mt-6 font-display text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── teacher ───────────────────────── */

function TeacherSection() {
  return (
    <section id="muellim" className="relative py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 md:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <motion.div whileHover={{ rotate: -1, y: -4 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} className="relative mx-auto w-full max-w-[360px] rotate-[-4deg] bg-white p-4 pb-16 shadow-[0_24px_50px_-20px_rgba(42,31,23,.45)] dark:bg-[#efe6d8]">
            <Tape color="ember" className="-top-3 left-1/2 -translate-x-1/2" rotate={3} />
            <div className="relative grid aspect-[4/5] place-items-center overflow-hidden bg-[#F3E2CC]">
              <div className="paper-dots absolute inset-0 opacity-60" />
              <div className="relative text-center">
                <div className="font-display text-[110px] font-semibold leading-none text-[#D85810]">SA</div>
                <LogoCat className="mx-auto -mt-2 h-24 w-auto" />
              </div>
            </div>
            <div className="hand absolute inset-x-0 bottom-4 text-center text-3xl text-[#2a1f17]">Sədaqət Ağayeva</div>
          </motion.div>
        </Reveal>
        <Reveal delay={0.15}>
          <Note className="text-2xl !text-signal">müəllim</Note>
          <h2 className="mt-2 font-display text-4xl font-semibold leading-[1.04] sm:text-5xl">
            Hər tələbəyə <Highlight>bələdçi</Highlight>
          </h2>
          <blockquote className="hand mt-8 border-l-4 border-signal pl-5 text-[32px] leading-[1.15] text-fg">
            “Dil öyrənmək — səyahətdir. Mən sizə yolu göstərirəm, siz isə hər gün bir addım atın.”
          </blockquote>
          <p className="mt-6 text-lg text-muted">
            İngilis dili müəllimi, Eduventure-un yaradıcısı. Qruplar yaradır, tapşırıqlar verir və hər tələbənin irəliləyişini öz dəftərində izləyir.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              [Users, 'Qruplar'],
              [Trophy, 'Reytinq'],
              [BookOpen, 'Dərslər'],
            ].map(([I, l]) => {
              const Icon = I as typeof Users;
              return (
                <span key={l as string} className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-elev px-4 py-2 font-display font-medium shadow-stamp-sm">
                  <Icon className="size-4 text-signal" /> {l as string}
                </span>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── ticket CTA ───────────────────────── */

function TicketCTA() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <Reveal>
        <div className="relative mx-auto flex max-w-5xl flex-col overflow-hidden rounded-[28px] border-2 border-ink bg-elev shadow-[6px_6px_0_0_var(--ink)] md:flex-row">
          <div className="relative flex-1 p-8 sm:p-12">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-subtle">
              <Plane className="size-4 text-signal" /> Səyahət bileti · BAK → B2
            </div>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.02] sm:text-5xl">
              Biletin <Scribble>hazırdır</Scribble>
            </h2>
            <p className="mt-4 max-w-md text-lg text-muted">Qeydiyyat bir dəqiqə çəkir. Pişiyimiz artıq yerini tutub.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/register" size="lg" magnetic rightIcon={<ArrowRight />}>Qeydiyyatdan keç</ButtonLink>
              <span className="hand text-2xl text-muted">pulsuzdur!</span>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t-2 border-dashed border-line-strong pt-5 font-mono text-xs uppercase tracking-[0.14em] text-subtle">
              <div>Sərnişin<div className="mt-1 font-display text-base normal-case tracking-normal text-fg">Sən</div></div>
              <div>Qapı<div className="mt-1 font-display text-base normal-case tracking-normal text-fg">A2</div></div>
              <div>Yer<div className="mt-1 font-display text-base normal-case tracking-normal text-fg">1A</div></div>
            </div>
          </div>
          {/* perforation */}
          <div className="relative hidden w-0 md:block">
            <div className="absolute -top-4 left-0 size-8 -translate-x-1/2 rounded-full border-2 border-ink bg-bg" />
            <div className="absolute -bottom-4 left-0 size-8 -translate-x-1/2 rounded-full border-2 border-ink bg-bg" />
            <div className="absolute inset-y-6 left-0 border-l-2 border-dashed border-ink/40" />
          </div>
          <div className="relative grid place-items-center gap-4 border-t-2 border-dashed border-ink/40 bg-sunken p-8 md:w-[300px] md:border-t-0">
            <Mascot mode="celebrate" size={120} />
            <Stamp tone="moss" rotate={-14} className="absolute right-6 top-6 text-[10px]">Təsdiq<br />✓</Stamp>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────── footer ───────────────────────── */

function Footer() {
  return (
    <footer className="border-t-2 border-dashed border-line-strong">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 py-12 sm:flex-row sm:px-6">
        <LogoLockup layout="inline" className="h-14 text-[30px]" />
        <div className="text-center sm:text-right">
          <p className="hand text-2xl text-muted">İngilis dilini birlikdə öyrənək</p>
          <p className="mt-1 text-sm text-subtle">© {new Date().getFullYear()} Eduventure · müəllim Sədaqət Ağayeva</p>
        </div>
      </div>
    </footer>
  );
}
