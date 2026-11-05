'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';
import { Logo } from '@/components/shell';
import { BookCatMark } from '@/components/brand/BookCat';
import { Highlight, Note, Scribble } from '@/components/notebook';

type Mode = 'login' | 'register';

export function AuthForm({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isLogin = mode === 'login';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isLogin && name.trim().length < 2) e.name = 'Adınızı daxil edin';
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Düzgün e-poçt daxil edin';
    if (password.length < (isLogin ? 1 : 8)) e.password = isLogin ? 'Şifrəni daxil edin' : 'Ən azı 8 simvol';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      const next = params.get('next');
      router.replace(next && next.startsWith('/') ? next : '/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Xəta baş verdi';
      setFormError(
        err instanceof ApiError && err.status === 401
          ? 'E-poçt və ya şifrə yanlışdır'
          : err instanceof ApiError && err.status === 409
            ? 'Bu e-poçt artıq qeydiyyatdadır'
            : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Art side — an open notebook page */}
      <aside className="relative hidden overflow-hidden border-r-2 border-ink bg-elev paper-ruled lg:flex lg:flex-col lg:justify-between lg:p-10 lg:pl-20">
        <Logo className="relative" />
        <div className="relative">
          <Note className="text-[28px] !text-signal" rotate={-3}>{isLogin ? 'Xoş gəldin, səyyah!' : 'Yeni səhifə açırıq'}</Note>
          <h2 className="mt-4 max-w-md font-display text-5xl font-semibold leading-[1.02]">
            {isLogin ? (
              <>Dəftərin səni <Highlight inView={false} delay={0.6}>gözləyir</Highlight></>
            ) : (
              <>Hər söz — yeni <Scribble inView={false} delay={0.6}>səhifə</Scribble></>
            )}
          </h2>
          <p className="mt-5 max-w-sm text-lg text-muted">Testlər, kurslar, fləşkartlar və hər gün yeni XP — ingilis dilini birlikdə öyrənək.</p>
        </div>
        <div className="relative flex items-end justify-between">
          <span className="hand text-2xl text-subtle">— Sədaqət müəllim</span>
          <BookCatMark animated idle delay={0.2} className="h-44 w-auto" />
        </div>
      </aside>

      {/* Form side */}
      <main className="relative flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="absolute left-5 top-5 lg:hidden">
          <Logo />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          <span className="hand text-2xl text-signal">{isLogin ? 'giriş' : 'qeydiyyat'}</span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {isLogin ? 'Hesabına daxil ol' : 'Hesab yarat'}
          </h1>
          <p className="mt-2 text-muted">
            {isLogin ? 'Hesabın yoxdur? ' : 'Artıq hesabın var? '}
            <Link href={isLogin ? '/register' : '/login'} className="font-bold text-signal underline decoration-wavy decoration-signal/60 decoration-2 underline-offset-4">
              {isLogin ? 'Qeydiyyatdan keç' : 'Daxil ol'}
            </Link>
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 rounded-3xl border-2 border-ink bg-elev p-6 shadow-[5px_5px_0_0_var(--ink)] sm:p-7">
            {!isLogin && (
              <Field label="Ad, soyad" htmlFor="name" error={errors.name}>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aysel Məmmədova" />
              </Field>
            )}
            <Field label="E-poçt" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad@nümunə.az" />
            </Field>
            <Field label="Şifrə" htmlFor="password" error={errors.password} hint={!isLogin ? 'Ən azı 8 simvol' : undefined}>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {formError && (
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
                role="alert"
              >
                {formError}
              </motion.p>
            )}

            <Button type="submit" size="lg" block magnetic loading={loading} rightIcon={<ArrowRight />}>
              {isLogin ? 'Daxil ol' : 'Ekspedisiyaya başla'}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
