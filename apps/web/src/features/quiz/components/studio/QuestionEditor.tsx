'use client';

import { useId, useRef } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from 'lucide-react';
import { Button, Field, IconButton, Input, Select, Textarea } from '@/components/ui';
import { Note } from '@/components/notebook';
import { cn } from '@/lib/utils';
import { DIFFICULTY_LABEL, QUESTION_TYPES, QUESTION_TYPE_HINT, QUESTION_TYPE_LABEL } from '../../lib/constants';
import { blankCount, letter, parseBlanks } from '../../lib/utils';
import type { QuestionType } from '../../types';
import { changeType, syncBlanks, type QDraft } from './draft';
import { TagInput } from './parts';

const TYPE_OPTIONS = QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABEL[t] }));

export function QuestionEditor({
  value: d,
  onChange,
  error,
  showDifficulty,
  tagSuggestions,
}: {
  value: QDraft;
  onChange: (d: QDraft) => void;
  error?: string | null;
  showDifficulty?: boolean;
  tagSuggestions?: string[];
}) {
  const uid = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<QDraft>) => onChange({ ...d, ...patch });

  const setText = (text: string) =>
    set(d.type === 'FILL_BLANKS' ? { text, blanks: syncBlanks(text, d.blanks) } : { text });

  const insertBlank = () => {
    const n = blankCount(d.text) + 1;
    const el = textRef.current;
    const token = `{{${n}}}`;
    const pos = el?.selectionStart ?? d.text.length;
    const text = d.text.slice(0, pos) + token + d.text.slice(el?.selectionEnd ?? pos);
    setText(text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + token.length, pos + token.length);
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem] md:grid-cols-[1fr_7rem_9rem]">
        <Field label="Sual tipi" htmlFor={`${uid}-type`} hint={QUESTION_TYPE_HINT[d.type]}>
          <Select
            id={`${uid}-type`}
            value={d.type}
            options={TYPE_OPTIONS}
            onChange={(e) => onChange(changeType(d, e.target.value as QuestionType))}
          />
        </Field>
        <Field label="Bal" htmlFor={`${uid}-pts`}>
          <Input
            id={`${uid}-pts`}
            type="number"
            min={1}
            max={100}
            value={d.points}
            onChange={(e) => set({ points: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        {showDifficulty && (
          <Field label="Çətinlik" htmlFor={`${uid}-dif`}>
            <Select
              id={`${uid}-dif`}
              value={String(d.difficulty)}
              options={[1, 2, 3].map((n) => ({ value: String(n), label: DIFFICULTY_LABEL[n] }))}
              onChange={(e) => set({ difficulty: Number(e.target.value) })}
            />
          </Field>
        )}
      </div>

      <Field
        label="Sual mətni"
        htmlFor={`${uid}-text`}
        required
        hint={d.type === 'FILL_BLANKS' ? 'Boşluqları {{1}}, {{2}} kimi yaz' : undefined}
        labelRight={
          d.type === 'FILL_BLANKS' ? (
            <button type="button" onClick={insertBlank} className="hand text-lg text-signal hover:underline">
              + boşluq
            </button>
          ) : undefined
        }
      >
        <Textarea
          ref={textRef}
          id={`${uid}-text`}
          rows={3}
          autoGrow
          value={d.text}
          onChange={(e) => setText(e.target.value)}
          placeholder={d.type === 'TRUE_FALSE' ? 'Məs.: "She don\'t like tea" cümləsi düzgündür.' : 'Sualı yaz…'}
        />
      </Field>

      <div>
        <Note className="text-xl">{bodyLabel(d.type)}</Note>
        <div className="mt-2">
          <Body d={d} set={set} uid={uid} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="İzah (cavabdan sonra göstərilir)" htmlFor={`${uid}-exp`}>
          <Textarea id={`${uid}-exp`} rows={2} autoGrow value={d.explanation} onChange={(e) => set({ explanation: e.target.value })} placeholder="Niyə bu cavab düzgündür?" />
        </Field>
        <Field label="Teqlər (mövzular)" htmlFor={`${uid}-tags`} hint="Enter ilə əlavə et — zəif mövzu analizi üçün">
          <TagInput id={`${uid}-tags`} value={d.tags} onChange={(tags) => set({ tags })} suggestions={tagSuggestions} placeholder="present-simple, vocabulary…" />
        </Field>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-danger/60 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function bodyLabel(t: QuestionType) {
  switch (t) {
    case 'SINGLE':
      return 'Variantlar — düzgün olanı işarələ';
    case 'MULTIPLE':
      return 'Variantlar — bütün düzgünləri işarələ';
    case 'TEXT':
      return 'Qəbul edilən cavablar';
    case 'TRUE_FALSE':
      return 'Düzgün cavab';
    case 'ORDERING':
      return 'Elementlər — düzgün ardıcıllıqla yaz';
    case 'FILL_BLANKS':
      return 'Hər boşluq üçün qəbul edilən cavablar';
    default:
      return 'Cavab';
  }
}

function Body({ d, set, uid }: { d: QDraft; set: (p: Partial<QDraft>) => void; uid: string }) {
  switch (d.type) {
    case 'SINGLE':
    case 'MULTIPLE':
      return <ChoiceList d={d} set={set} />;
    case 'TEXT':
      return <StringList values={d.answers} onChange={(answers) => set({ answers })} placeholder="Qəbul edilən cavab" addLabel="Variant əlavə et" hint="Böyük/kiçik hərf və artıq boşluqlar nəzərə alınmır." />;
    case 'TRUE_FALSE':
      return (
        <div className="flex flex-wrap gap-3">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={d.value === v}
              onClick={() => set({ value: v })}
              className={cn(
                'min-w-32 rounded-2xl border-2 border-ink px-5 py-3 font-display text-lg font-bold transition-transform active:translate-x-[2px] active:translate-y-[2px]',
                d.value === v ? (v ? 'bg-moss/30 shadow-stamp' : 'bg-danger/20 shadow-stamp') : 'bg-surface hover:-translate-y-0.5',
              )}
            >
              {v ? 'Doğru' : 'Yanlış'}
            </button>
          ))}
        </div>
      );
    case 'ORDERING':
      return <OrderingList d={d} set={set} />;
    case 'FILL_BLANKS':
      return <BlanksEditor d={d} set={set} uid={uid} />;
    case 'OPEN':
    default:
      return (
        <p className="rounded-2xl border-2 border-dashed border-line-strong bg-sunken/60 px-4 py-3 text-sm text-muted">
          Tələbə sərbəst cavab yazacaq. Cavabı sən <b>Yoxlama</b> bölməsində əl ilə qiymətləndirəcəksən.
        </p>
      );
  }
}

function ChoiceList({ d, set }: { d: QDraft; set: (p: Partial<QDraft>) => void }) {
  const multi = d.type === 'MULTIPLE';
  const isOn = (i: number) => (multi ? d.indices.includes(i) : d.index === i);
  const toggle = (i: number) =>
    multi ? set({ indices: isOn(i) ? d.indices.filter((x) => x !== i) : [...d.indices, i] }) : set({ index: i });
  const remove = (i: number) => {
    const shift = (x: number) => (x > i ? x - 1 : x);
    set({
      options: d.options.filter((_, j) => j !== i),
      index: d.index === null || d.index === i ? null : shift(d.index),
      indices: d.indices.filter((x) => x !== i).map(shift),
    });
  };
  return (
    <div className="space-y-2">
      {d.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={isOn(i)}
            aria-label={`${letter(i)} variantını düzgün kimi işarələ`}
            className={cn(
              'grid size-10 shrink-0 place-items-center border-2 border-ink font-display font-bold transition-colors',
              multi ? 'rounded-lg' : 'rounded-full',
              isOn(i) ? 'bg-moss text-white shadow-stamp-sm' : 'bg-surface hover:bg-ember/20',
            )}
          >
            {isOn(i) ? <Check className="size-5" strokeWidth={3} /> : letter(i)}
          </button>
          <Input
            value={o}
            onChange={(e) => set({ options: d.options.map((x, j) => (j === i ? e.target.value : x)) })}
            placeholder={`${letter(i)} variantı`}
            wrapperClassName="flex-1 min-w-0"
          />
          <IconButton label="Variantı sil" variant="ghost" size="sm" disabled={d.options.length <= 2} onClick={() => remove(i)}>
            <Trash2 />
          </IconButton>
        </div>
      ))}
      {d.options.length < 10 && (
        <Button variant="ghost" size="sm" leftIcon={<Plus />} onClick={() => set({ options: [...d.options, ''] })}>
          Variant əlavə et
        </Button>
      )}
    </div>
  );
}

function OrderingList({ d, set }: { d: QDraft; set: (p: Partial<QDraft>) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.options.length) return;
    const next = [...d.options];
    [next[i], next[j]] = [next[j], next[i]];
    set({ options: next });
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Tələbə elementləri qarışıq görəcək. Burada düzgün sıranı yaz.</p>
      {d.options.map((o, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="hand w-7 shrink-0 text-center text-2xl text-subtle">{i + 1}.</span>
          <Input
            value={o}
            onChange={(e) => set({ options: d.options.map((x, j) => (j === i ? e.target.value : x)) })}
            placeholder={`${i + 1}-ci element`}
            wrapperClassName="flex-1 min-w-0"
          />
          <IconButton label="Yuxarı" variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>
            <ArrowUp />
          </IconButton>
          <IconButton label="Aşağı" variant="ghost" size="sm" disabled={i === d.options.length - 1} onClick={() => move(i, 1)}>
            <ArrowDown />
          </IconButton>
          <IconButton label="Elementi sil" variant="ghost" size="sm" disabled={d.options.length <= 2} onClick={() => set({ options: d.options.filter((_, j) => j !== i) })}>
            <Trash2 />
          </IconButton>
        </div>
      ))}
      {d.options.length < 12 && (
        <Button variant="ghost" size="sm" leftIcon={<Plus />} onClick={() => set({ options: [...d.options, ''] })}>
          Element əlavə et
        </Button>
      )}
    </div>
  );
}

function StringList({
  values,
  onChange,
  placeholder,
  addLabel,
  hint,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  addLabel: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={v} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} placeholder={placeholder} wrapperClassName="flex-1 min-w-0" />
          <IconButton label="Sil" variant="ghost" size="sm" disabled={values.length <= 1} onClick={() => onChange(values.filter((_, j) => j !== i))}>
            <X />
          </IconButton>
        </div>
      ))}
      <Button variant="ghost" size="sm" leftIcon={<Plus />} onClick={() => onChange([...values, ''])}>
        {addLabel}
      </Button>
    </div>
  );
}

function BlanksEditor({ d, set, uid }: { d: QDraft; set: (p: Partial<QDraft>) => void; uid: string }) {
  const blanks = syncBlanks(d.text, d.blanks);
  const segments = parseBlanks(d.text);
  if (!blanks.length) {
    return <p className="text-sm text-danger">Mətndə hələ boşluq yoxdur — “+ boşluq” düyməsi ilə əlavə et.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="paper-ruled rounded-2xl border border-line bg-surface px-4 py-3 pl-14 text-lg leading-8">
        {segments.map((s, i) =>
          s.kind === 'text' ? (
            <span key={i}>{s.value}</span>
          ) : (
            <span key={i} className="mx-0.5 inline-block min-w-12 border-b-2 border-dashed border-signal px-1 text-center font-mono text-sm text-signal">
              {s.n}
            </span>
          ),
        )}
      </p>
      {blanks.map((b, i) => (
        <Field key={i} label={`{{${i + 1}}} boşluğu`} htmlFor={`${uid}-b${i}`}>
          <TagInput
            id={`${uid}-b${i}`}
            value={b}
            onChange={(v) => set({ blanks: blanks.map((x, j) => (j === i ? v : x)) })}
            placeholder="cavab variantı + Enter"
          />
        </Field>
      ))}
      <Field label="Söz bankı (istəyə görə)" htmlFor={`${uid}-wb`} hint="Tələbəyə seçim üçün göstəriləcək sözlər">
        <TagInput id={`${uid}-wb`} value={d.options} onChange={(options) => set({ options })} placeholder="söz + Enter" />
      </Field>
    </div>
  );
}
