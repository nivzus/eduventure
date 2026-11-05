'use client';

import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Flag } from 'lucide-react';
import { cn, EASE_OUT_EXPO } from '@/lib/utils';
import { QUESTION_TYPE_HINT, QUESTION_TYPE_LABEL } from '../../lib/constants';
import type { AnswerValue, Question } from '../../types';
import { QuestionRenderer, type RendererFeedback } from './renderers';
import { PracticeFeedback } from './PracticeFeedback';

interface QuestionStageProps {
  question: Question;
  index: number;
  total: number;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  flagged: boolean;
  disabled?: boolean;
  feedback?: (RendererFeedback & { explanation?: string | null }) | null;
  seed: string;
  direction: number;
  onSubmitIntent?: () => void;
}

export const QuestionStage = forwardRef<HTMLElement, QuestionStageProps>(function QuestionStage(
  { question, index, total, value, onChange, flagged, disabled, feedback, seed, direction, onSubmitIntent },
  ref,
) {
  const reduce = useReducedMotion();
  const number = String(index + 1).padStart(2, '0');
  const isBlanks = question.type === 'FILL_BLANKS';

  return (
    <motion.section
      ref={ref}
      custom={direction}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 48, filter: 'blur(8px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -32, filter: 'blur(6px)', transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      aria-labelledby={`q-title-${question.id}`}
      className="relative"
    >
      <div className="mb-5 flex items-end gap-4 sm:mb-7">
        <span
          aria-hidden
          className="select-none font-display text-[64px] font-bold leading-[0.8] tracking-tighter text-transparent sm:text-[96px]"
          style={{ WebkitTextStroke: '1.5px var(--border-strong)' }}
        >
          {number}
        </span>
        <div className="flex min-w-0 flex-col gap-1.5 pb-1">
          <span className="mono-label">
            Sual {index + 1} / {total}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="mono-label !text-fg">{QUESTION_TYPE_LABEL[question.type]}</span>
            <span className="mono-label">·</span>
            <span className="mono-label">{question.points} bal</span>
            {flagged && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 rounded-full bg-ember/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ember"
              >
                <Flag className="h-3 w-3" fill="currentColor" /> İşarələnib
              </motion.span>
            )}
          </span>
        </div>
      </div>

      <h2
        id={`q-title-${question.id}`}
        className={cn(
          'font-sans font-semibold tracking-tight text-fg',
          isBlanks ? 'text-lg text-muted' : 'text-[22px] leading-[1.3] sm:text-[30px] sm:leading-[1.22]',
        )}
      >
        {isBlanks ? QUESTION_TYPE_HINT.FILL_BLANKS : question.text}
      </h2>
      {!isBlanks && <p className="mt-2 text-sm text-subtle">{QUESTION_TYPE_HINT[question.type]}</p>}

      {question.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageUrl}
          alt=""
          className="mt-6 max-h-72 w-full rounded-3xl border border-line bg-sunken object-contain"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}

      <div className="mt-7 sm:mt-9">
        <QuestionRenderer
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
          feedback={feedback}
          seed={seed}
          onSubmitIntent={onSubmitIntent}
        />
      </div>

      {feedback && (
        <div className="mt-6">
          <PracticeFeedback correct={feedback.correct} explanation={feedback.explanation} />
        </div>
      )}
    </motion.section>
  );
});
