'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileUp, Search, Sparkles } from 'lucide-react';
import { Badge, Button, Checkbox, Field, Input, Modal, Select, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Mascot } from '@/components/brand/Mascot';
import { cn } from '@/lib/utils';
import { useAiGenerate, useBank, useGroups, useSetVisibility } from '../../hooks';
import { DIFFICULTY_LABEL, QUESTION_TYPES, QUESTION_TYPE_LABEL, VISIBILITY_HINT, VISIBILITY_LABEL } from '../../lib/constants';
import { errorMessage, plainQuestionText } from '../../lib/utils';
import type { BankQuestion, QuestionType, Visibility } from '../../types';

/* ------------------------------------------------------------------ */
/* CSV import                                                          */
/* ------------------------------------------------------------------ */

type ImportResult = { imported?: number; errors?: { row: number; message: string }[] };

export function CsvImportModal({
  open,
  onClose,
  onImport,
  title = 'CSV-dən idxal',
}: {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportResult | unknown>;
  title?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setResult(null);
    }
  }, [open]);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const r = ((await onImport(file)) ?? {}) as ImportResult;
      setResult(r);
      const n = r.imported ?? 0;
      if (n) toast.success(`${n} sual idxal edildi`);
      if (!r.errors?.length) onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'İdxal alınmadı'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Başlıq sətri: text, type, options, correctAnswers, explanation, points (+ tags, difficulty). Siyahılar | ilə ayrılır."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bağla
          </Button>
          <Button leftIcon={<FileUp />} disabled={!file} loading={busy} onClick={run}>
            İdxal et
          </Button>
        </>
      }
    >
      <label
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-sunken/50 px-4 py-8 text-center transition-colors hover:border-ink',
          file && 'border-ink bg-ember/10',
        )}
      >
        <FileUp className="size-8 text-signal" />
        <span className="font-semibold">{file ? file.name : 'CSV faylını seç'}</span>
        <span className="hand text-lg text-muted">{file ? `${Math.ceil(file.size / 1024)} KB` : 'və ya bura sürüklə'}</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface p-3 font-mono text-xs leading-5 text-muted">
        {'text,type,options,correctAnswers,explanation,points\n"She ___ tea.",SINGLE,like|likes|liking,likes,3-cü şəxs,1'}
      </pre>
      {result?.errors?.length ? (
        <div className="mt-4 rounded-xl border-2 border-danger/50 bg-danger/10 p-3 text-sm">
          <p className="font-bold text-danger">
            {result.imported ?? 0} sual idxal edildi, {result.errors.length} sətirdə xəta:
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {result.errors.map((e, i) => (
              <li key={i}>
                <b>{e.row}-ci sətir:</b> {e.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* AI generate                                                         */
/* ------------------------------------------------------------------ */

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function AiGenerateModal({
  open,
  onClose,
  onAccept,
  acceptLabel = 'Testə əlavə et',
}: {
  open: boolean;
  onClose: () => void;
  onAccept: (questions: BankQuestion[]) => Promise<void> | void;
  acceptLabel?: string;
}) {
  const gen = useAiGenerate();
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [type, setType] = useState<QuestionType | ''>('');
  const [level, setLevel] = useState('B1');
  const [drafts, setDrafts] = useState<BankQuestion[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDrafts(null);
      setPicked(new Set());
    }
  }, [open]);

  const generate = async () => {
    if (topic.trim().length < 2) return toast.error('Mövzunu yaz');
    try {
      const list = await gen.mutateAsync({ topic: topic.trim(), count, type: type || undefined, level });
      setDrafts(list);
      setPicked(new Set(list.map((q) => q.id)));
      if (!list.length) toast.info('Sual yaradılmadı — başqa mövzu yoxla');
    } catch (e) {
      toast.error(errorMessage(e, 'AI sual yarada bilmədi'));
    }
  };

  const accept = async () => {
    if (!drafts) return;
    setSaving(true);
    try {
      await onAccept(drafts.filter((q) => picked.has(q.id)));
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-5 text-signal" /> AI ilə sual yarat
        </span>
      }
      description="Mövzunu yaz — AI qaralama suallar hazırlayacaq, sən seçib əlavə edəcəksən."
      size="lg"
      footer={
        drafts ? (
          <>
            <Button variant="ghost" onClick={() => setDrafts(null)}>
              Yenidən
            </Button>
            <Button disabled={!picked.size} loading={saving} onClick={accept}>
              {acceptLabel} ({picked.size})
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Ləğv et
            </Button>
            <Button leftIcon={<Sparkles />} loading={gen.isPending} onClick={generate}>
              Yarat
            </Button>
          </>
        )
      }
    >
      {!drafts ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mövzu" htmlFor="ai-topic" required className="sm:col-span-2">
            <Input id="ai-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Present Perfect, food vocabulary…" autoFocus onKeyDown={(e) => e.key === 'Enter' && generate()} />
          </Field>
          <Field label="Say" htmlFor="ai-count">
            <Input id="ai-count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
          </Field>
          <Field label="Səviyyə" htmlFor="ai-level">
            <Select id="ai-level" value={level} options={LEVELS.map((l) => ({ value: l, label: l }))} onChange={(e) => setLevel(e.target.value)} />
          </Field>
          <Field label="Sual tipi" htmlFor="ai-type" className="sm:col-span-2">
            <Select
              id="ai-type"
              value={type}
              options={[{ value: '', label: 'Qarışıq' }, ...QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABEL[t] }))]}
              onChange={(e) => setType(e.target.value as QuestionType | '')}
            />
          </Field>
          {gen.isPending && (
            <div className="space-y-2 sm:col-span-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          )}
        </div>
      ) : drafts.length === 0 ? (
        <div className="grid place-items-center py-6 text-center">
          <Mascot mode="sad" size={90} />
          <p className="hand mt-3 text-2xl text-muted">Heç nə tapılmadı</p>
        </div>
      ) : (
        <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {drafts.map((q) => (
            <li key={q.id} className={cn('rounded-2xl border-2 px-3 py-2.5 transition-colors', picked.has(q.id) ? 'border-ink bg-ember/10' : 'border-line bg-surface')}>
              <Checkbox
                checked={picked.has(q.id)}
                onCheckedChange={(c) =>
                  setPicked((s) => {
                    const n = new Set(s);
                    if (c) n.add(q.id);
                    else n.delete(q.id);
                    return n;
                  })
                }
                label={<span className="font-semibold">{plainQuestionText(q)}</span>}
                description={
                  <span className="flex flex-wrap gap-1.5 pt-1">
                    <Badge tone="glacier">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                    {q.options.slice(0, 4).map((o, i) => (
                      <span key={i} className="text-xs text-muted">
                        {o}
                        {i < Math.min(3, q.options.length - 1) ? ' ·' : ''}
                      </span>
                    ))}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Bank picker                                                         */
/* ------------------------------------------------------------------ */

export function BankPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (questions: BankQuestion[]) => void;
}) {
  const [q, setQ] = useState('');
  const [type, setType] = useState<QuestionType | ''>('');
  const [picked, setPicked] = useState<Map<string, BankQuestion>>(new Map());
  const { data, isLoading } = useBank({ q: q.trim() || undefined, type }, open);

  useEffect(() => {
    if (!open) setPicked(new Map());
  }, [open]);

  const toggle = (bq: BankQuestion) =>
    setPicked((m) => {
      const n = new Map(m);
      if (n.has(bq.id)) n.delete(bq.id);
      else n.set(bq.id, bq);
      return n;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bankdan əlavə et"
      description="Sual bankından seç — testə surəti əlavə olunacaq."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button
            disabled={!picked.size}
            onClick={() => {
              onPick([...picked.values()]);
              onClose();
            }}
          >
            Əlavə et ({picked.size})
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input leftIcon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Axtar…" wrapperClassName="flex-1" />
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType | '')}
          options={[{ value: '', label: 'Bütün tiplər' }, ...QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABEL[t] }))]}
          wrapperClassName="sm:w-48"
        />
      </div>
      <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
        ) : !data?.length ? (
          <div className="grid place-items-center py-6 text-center">
            <Mascot mode="peek" size={80} />
            <p className="hand mt-2 text-2xl text-muted">Bank boşdur</p>
          </div>
        ) : (
          data.map((bq) => (
            <div key={bq.id} className={cn('rounded-2xl border-2 px-3 py-2.5', picked.has(bq.id) ? 'border-ink bg-ember/10' : 'border-line bg-surface')}>
              <Checkbox
                checked={picked.has(bq.id)}
                onCheckedChange={() => toggle(bq)}
                label={<span className="font-semibold">{plainQuestionText(bq)}</span>}
                description={
                  <span className="flex flex-wrap gap-1.5 pt-1">
                    <Badge tone="glacier">{QUESTION_TYPE_LABEL[bq.type]}</Badge>
                    <Badge>{DIFFICULTY_LABEL[bq.difficulty] ?? bq.difficulty}</Badge>
                    {bq.tags.slice(0, 3).map((t) => (
                      <Badge key={t} tone="ember">
                        #{t}
                      </Badge>
                    ))}
                  </span>
                }
              />
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Visibility                                                          */
/* ------------------------------------------------------------------ */

const VIS: Visibility[] = ['PUBLIC', 'PRIVATE', 'GROUPS', 'PASSCODE'];

export function VisibilityModal({
  open,
  onClose,
  quiz,
}: {
  open: boolean;
  onClose: () => void;
  quiz: { id: string; title: string; visibility: Visibility; passcode?: string | null; groupIds?: string[] } | null;
}) {
  const setVis = useSetVisibility();
  const [vis, setVisState] = useState<Visibility>('PUBLIC');
  const [passcode, setPasscode] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const groups = useGroups(open && vis === 'GROUPS');

  useEffect(() => {
    if (open && quiz) {
      setVisState(quiz.visibility);
      setPasscode(quiz.passcode ?? '');
      setGroupIds(quiz.groupIds ?? []);
    }
  }, [open, quiz]);

  const error = useMemo(() => {
    if (vis === 'PASSCODE' && passcode.trim().length < 3) return 'Kod ən azı 3 simvol olmalıdır';
    if (vis === 'GROUPS' && !groupIds.length) return 'Ən azı bir qrup seç';
    return null;
  }, [vis, passcode, groupIds]);

  const save = async () => {
    if (!quiz || error) return;
    try {
      await setVis.mutateAsync({ id: quiz.id, visibility: vis, passcode: passcode.trim(), groupIds });
      toast.success('Görünürlük yeniləndi');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kim görə bilər?"
      description={quiz?.title}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button disabled={Boolean(error)} loading={setVis.isPending} onClick={save}>
            Yadda saxla
          </Button>
        </>
      }
    >
      <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
        {VIS.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={vis === v}
            onClick={() => setVisState(v)}
            className={cn(
              'rounded-2xl border-2 px-4 py-3 text-left transition-all',
              vis === v ? 'border-ink bg-ember/15 shadow-stamp-sm' : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span className="block font-display font-bold">{VISIBILITY_LABEL[v]}</span>
            <span className="block text-sm text-muted">{VISIBILITY_HINT[v]}</span>
          </button>
        ))}
      </div>
      {vis === 'PASSCODE' && (
        <Field label="Giriş kodu" htmlFor="vis-code" className="mt-4" error={passcode && error ? error : undefined}>
          <Input id="vis-code" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="məs. ENGLISH7" className="font-mono" />
        </Field>
      )}
      {vis === 'GROUPS' && (
        <div className="mt-4">
          <p className="mono-label">Qruplar</p>
          <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
            {groups.isLoading ? (
              <Skeleton className="h-10" />
            ) : !groups.data?.length ? (
              <p className="text-sm text-muted">Hələ qrup yoxdur.</p>
            ) : (
              groups.data.map((g) => (
                <Checkbox
                  key={g.id}
                  checked={groupIds.includes(g.id)}
                  onCheckedChange={(c) => setGroupIds((ids) => (c ? [...ids, g.id] : ids.filter((x) => x !== g.id)))}
                  label={
                    <span className="inline-flex items-center gap-2">
                      <span className="size-3 rounded-full border border-ink" style={{ background: g.color ?? 'var(--ember)' }} />
                      {g.name}
                    </span>
                  }
                />
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
