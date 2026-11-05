'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'motion/react';
import { KeyRound } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';

interface PasscodeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  loading?: boolean;
  error?: string | null;
  quizTitle?: string;
}

export function PasscodeModal({ open, onClose, onSubmit, loading, error, quizTitle }: PasscodeModalProps) {
  const [code, setCode] = useState('');
  const controls = useAnimationControls();

  useEffect(() => {
    if (!open) setCode('');
  }, [open]);

  useEffect(() => {
    if (error) void controls.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } });
  }, [error, controls]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Giriş kodu tələb olunur"
      description={quizTitle ? `“${quizTitle}” testinə başlamaq üçün müəllimin verdiyi kodu daxil et.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button onClick={() => code.trim() && onSubmit(code.trim())} loading={loading} disabled={!code.trim()}>
            Kilidi aç
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onSubmit(code.trim());
        }}
      >
        <motion.div animate={controls} className="flex flex-col items-center gap-5 py-2">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-surface text-signal light:text-aurora">
            <KeyRound className="h-6 w-6" />
          </span>
          <Input
            data-autofocus
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="• • • • • •"
            inputSize="lg"
            invalid={Boolean(error)}
            autoComplete="one-time-code"
            aria-label="Giriş kodu"
            className="text-center font-mono text-xl tracking-[0.4em]"
          />
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
        </motion.div>
      </form>
    </Modal>
  );
}
