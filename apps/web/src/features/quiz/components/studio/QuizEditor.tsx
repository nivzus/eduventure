'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Eye,
  FileUp,
  GripVertical,
  Library,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Field, IconButton, Input, Menu, Segmented, Skeleton, Switch, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Mascot } from '@/components/brand/Mascot';
import { Note, Tape } from '@/components/notebook';
import { cn } from '@/lib/utils';
import { useCreateQuiz, useImportQuizCsv, useQuiz, useQuizCategories, useUpdateQuiz } from '../../hooks';
import { COVER_PALETTE, QUESTION_TYPES, QUESTION_TYPE_LABEL, STATUS_LABEL, VISIBILITY_LABEL } from '../../lib/constants';
import { errorMessage, normalizeQuestion, plainQuestionText } from '../../lib/utils';
import type { BankQuestion, ContentStatus, QuizDetail, QuizPayload } from '../../types';
import { blankDraft, newKey, toDraft, toPayload, validateDraft, type QDraft } from './draft';
import { QuestionEditor } from './QuestionEditor';
import { AiGenerateModal, BankPickerModal, CsvImportModal, VisibilityModal } from './StudioModals';
import { Sheet, TagInput } from './parts';

interface Settings {
  title: string;
  description: string;
  category: string;
  tags: string[];
  coverColor: string | null;
  timeLimitMin: string;
  passPercent: string;
  maxAttempts: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showAnswers: boolean;
  status: ContentStatus;
}

const DEFAULT_SETTINGS: Settings = {
  title: '',
  description: '',
  category: '',
  tags: [],
  coverColor: null,
  timeLimitMin: '',
  passPercent: '60',
  maxAttempts: '',
  shuffleQuestions: false,
  shuffleOptions: true,
  showAnswers: true,
  status: 'DRAFT',
};

function settingsFrom(q: QuizDetail): Settings {
  return {
    title: q.title ?? '',
    description: q.description ?? '',
    category: q.category ?? '',
    tags: q.tags ?? [],
    coverColor: q.coverColor ?? null,
    timeLimitMin: q.timeLimitSec ? String(Math.round(q.timeLimitSec / 60)) : '',
    passPercent: String(q.passPercent ?? 60),
    maxAttempts: q.maxAttempts ? String(q.maxAttempts) : '',
    shuffleQuestions: Boolean(q.shuffleQuestions),
    shuffleOptions: Boolean(q.shuffleOptions),
    showAnswers: q.showAnswers ?? true,
    status: q.status ?? 'DRAFT',
  };
}

function validateSettings(s: Settings): Partial<Record<keyof Settings, string>> {
  const e: Partial<Record<keyof Settings, string>> = {};
  if (s.title.trim().length < 2) e.title = 'Başlıq ən azı 2 simvol olmalıdır';
  const pp = Number(s.passPercent);
  if (s.passPercent === '' || !Number.isFinite(pp) || pp < 0 || pp > 100) e.passPercent = '0–100 arası';
  if (s.timeLimitMin && (!(Number(s.timeLimitMin) > 0) || Number(s.timeLimitMin) > 600)) e.timeLimitMin = '1–600 dəqiqə';
  if (s.maxAttempts && !(Number.isInteger(Number(s.maxAttempts)) && Number(s.maxAttempts) >= 1)) e.maxAttempts = 'Müsbət tam ədəd';
  return e;
}

function settingsPayload(s: Settings): Omit<QuizPayload, 'visibility' | 'questions'> {
  return {
    title: s.title.trim(),
    description: s.description.trim() || null,
    category: s.category.trim() || null,
    tags: s.tags,
    coverColor: s.coverColor,
    timeLimitSec: s.timeLimitMin ? Math.round(Number(s.timeLimitMin) * 60) : null,
    passPercent: Math.round(Number(s.passPercent)),
    maxAttempts: s.maxAttempts ? Number(s.maxAttempts) : null,
    shuffleQuestions: s.shuffleQuestions,
    shuffleOptions: s.shuffleOptions,
    showAnswers: s.showAnswers,
    status: s.status,
  };
}

const STATUS_TABS = (['DRAFT', 'PUBLISHED', 'ARCHIVED'] as ContentStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }));

export function QuizEditor({ id }: { id: string }) {
  const isNew = id === 'new';
  const router = useRouter();
  const { data: quiz, isLoading, isError } = useQuiz(isNew ? undefined : id);
  const categories = useQuizCategories();
  const create = useCreateQuiz();
  const update = useUpdateQuiz();
  const importCsv = useImportQuizCsv();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initial] = useState<QDraft[]>(() => (isNew ? [blankDraft('SINGLE')] : []));
  const [questions, setQuestions] = useState<QDraft[]>(initial);
  const [open, setOpen] = useState<string | null>(initial[0]?.key ?? null);
  const [qErrors, setQErrors] = useState<Record<string, string>>({});
  const [sErrors, setSErrors] = useState<Partial<Record<keyof Settings, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [modal, setModal] = useState<null | 'csv' | 'bank' | 'ai' | 'vis'>(null);
  const hydrated = useRef<string | null>(null);

  const hydrate = useCallback((q: QuizDetail, keepOpenIndex?: number) => {
    setSettings(settingsFrom(q));
    const drafts = q.questions.map((x) => toDraft(x));
    setQuestions(drafts);
    setOpen(keepOpenIndex !== undefined && drafts[keepOpenIndex] ? drafts[keepOpenIndex].key : null);
    setQErrors({});
    setSErrors({});
    setDirty(false);
    hydrated.current = `${q.id}:${q.updatedAt}:${q.questions.length}`;
  }, []);

  // Load server state once (and after external refreshes) as long as nothing is being edited.
  useEffect(() => {
    if (!quiz || dirty) return;
    const sig = `${quiz.id}:${quiz.updatedAt}:${quiz.questions.length}`;
    if (hydrated.current !== sig) hydrate(quiz);
  }, [quiz, dirty, hydrate]);

  // Unsaved-changes guard.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const patchSettings = (p: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...p }));
    setDirty(true);
    if (Object.keys(sErrors).length) setSErrors((e) => { const n = { ...e }; for (const k of Object.keys(p)) delete n[k as keyof Settings]; return n; });
  };
  const patchQuestions = (fn: (qs: QDraft[]) => QDraft[]) => {
    setQuestions(fn);
    setDirty(true);
  };
  const updateQuestion = (d: QDraft) => {
    patchQuestions((qs) => qs.map((q) => (q.key === d.key ? d : q)));
    if (qErrors[d.key]) setQErrors((e) => ({ ...e, [d.key]: validateDraft(d) ?? '' }));
  };

  const addQuestion = (type: (typeof QUESTION_TYPES)[number]) => {
    const d = blankDraft(type);
    patchQuestions((qs) => [...qs, d]);
    setOpen(d.key);
    requestAnimationFrame(() => document.getElementById(`qcard-${d.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const appendFromBank = (list: BankQuestion[]) => {
    if (!list.length) return;
    patchQuestions((qs) => [...qs, ...list.map((b) => ({ ...toDraft(b, false), key: newKey() }))]);
    toast.success(`${list.length} sual əlavə edildi — yadda saxlamağı unutma`);
  };
  const duplicate = (d: QDraft) => {
    const copy: QDraft = { ...structuredClone(d), id: undefined, key: newKey() };
    patchQuestions((qs) => {
      const i = qs.findIndex((q) => q.key === d.key);
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });
    setOpen(copy.key);
  };
  const remove = (d: QDraft) => {
    patchQuestions((qs) => qs.filter((q) => q.key !== d.key));
    toast.info('Sual silindi');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    patchQuestions((qs) => {
      const from = qs.findIndex((q) => q.key === active.id);
      const to = qs.findIndex((q) => q.key === over.id);
      return arrayMove(qs, from, to);
    });
  };

  const totalPoints = useMemo(() => questions.reduce((s, q) => s + (q.points || 1), 0), [questions]);

  /** Validates + saves. Returns the quiz id on success. */
  const save = async (): Promise<string | null> => {
    const se = validateSettings(settings);
    const qe: Record<string, string> = {};
    for (const q of questions) {
      const err = validateDraft(q);
      if (err) qe[q.key] = err;
    }
    setSErrors(se);
    setQErrors(qe);
    if (Object.keys(se).length) {
      toast.error(Object.values(se)[0] ?? 'Parametrlərdə xəta var');
      document.getElementById('quiz-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return null;
    }
    const firstBad = questions.find((q) => qe[q.key]);
    if (firstBad) {
      const n = questions.indexOf(firstBad) + 1;
      toast.error(`${n}-ci sual: ${qe[firstBad.key]}`);
      setOpen(firstBad.key);
      requestAnimationFrame(() => document.getElementById(`qcard-${firstBad.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return null;
    }
    const openIndex = questions.findIndex((q) => q.key === open);
    const payload = { ...settingsPayload(settings), questions: questions.map((q, i) => toPayload(q, i)) };
    try {
      if (isNew) {
        const created = await create.mutateAsync({ ...payload, visibility: 'PUBLIC' });
        hydrate(created, openIndex >= 0 ? openIndex : undefined);
        toast.success('Test yaradıldı');
        router.replace(`/studio/quizzes/${created.id}`);
        return created.id;
      }
      const saved = await update.mutateAsync({ id, data: payload });
      if (Array.isArray(saved?.questions) && saved.questions.length === questions.length) hydrate(saved, openIndex >= 0 ? openIndex : undefined);
      else setDirty(false);
      toast.success('Yadda saxlanıldı');
      return id;
    } catch (e) {
      toast.error(errorMessage(e, 'Yadda saxlamaq alınmadı'));
      return null;
    }
  };

  const onCsv = async (file: File) => {
    const qid = dirty || isNew ? await save() : id;
    if (!qid) throw new Error('Əvvəlcə testi yadda saxla');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await importCsv.mutateAsync({ id: qid, file });
    if (res?.quiz?.questions) {
      const q = { ...res.quiz, tags: res.quiz.tags ?? [], questions: res.quiz.questions.map(normalizeQuestion) } as QuizDetail;
      hydrate(q);
    }
    return res;
  };

  const saving = create.isPending || update.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="h-10 w-64" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[22rem_1fr]">
          <Skeleton className="h-[28rem]" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!isNew && (isError || !quiz)) {
    return (
      <div className="grid place-items-center px-4 py-20 text-center">
        <Mascot mode="sad" size={110} />
        <h1 className="mt-6 text-3xl">Test tapılmadı</h1>
        <Button className="mt-6" onClick={() => router.push('/studio/quizzes')}>
          Testlərimə qayıt
        </Button>
      </div>
    );
  }

  const guardLeave = (e: React.MouseEvent) => {
    if (dirty && !window.confirm('Saxlanmamış dəyişikliklər itəcək. Çıxmaq istəyirsən?')) e.preventDefault();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6">
      <Link href="/studio/quizzes" onClick={guardLeave} className="hand text-xl text-muted hover:text-fg">
        ← testlərim
      </Link>
      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Note className="text-2xl !text-signal">{isNew ? 'yeni test' : 'redaktə'}</Note>
          <h1 className="mt-1 break-words text-3xl leading-tight sm:text-5xl">{settings.title.trim() || 'Adsız test'}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && quiz && (
            <>
              <Button variant="outline" size="sm" leftIcon={<Lock />} onClick={() => setModal('vis')}>
                {VISIBILITY_LABEL[quiz.visibility]}
              </Button>
              <Link href={`/quizzes/${quiz.id}`} target="_blank" className="inline-flex">
                <Button variant="ghost" size="sm" leftIcon={<Eye />} tabIndex={-1}>
                  Önizlə
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Settings */}
        <Sheet className="lg:sticky lg:top-20" >
          <div id="quiz-settings" className="scroll-mt-24" />
          <Tape className="-top-3 left-8" color="aurora" />
          <h2 className="font-display text-xl font-bold">Parametrlər</h2>
          <div className="mt-4 space-y-4">
            <Field label="Başlıq" htmlFor="qs-title" required error={sErrors.title}>
              <Input id="qs-title" value={settings.title} invalid={Boolean(sErrors.title)} onChange={(e) => patchSettings({ title: e.target.value })} placeholder="Present Simple — 1-ci hissə" />
            </Field>
            <Field label="Təsvir" htmlFor="qs-desc">
              <Textarea id="qs-desc" rows={2} autoGrow value={settings.description} onChange={(e) => patchSettings({ description: e.target.value })} placeholder="Test nə haqqındadır?" />
            </Field>
            <Field label="Kateqoriya" htmlFor="qs-cat">
              <Input id="qs-cat" list="qs-cat-list" value={settings.category} onChange={(e) => patchSettings({ category: e.target.value })} placeholder="Grammar, Vocabulary…" />
              <datalist id="qs-cat-list">
                {(categories.data ?? []).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Teqlər" htmlFor="qs-tags">
              <TagInput id="qs-tags" value={settings.tags} onChange={(tags) => patchSettings({ tags })} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Üz rəngi</p>
              <div className="flex flex-wrap gap-2">
                <Swatch active={!settings.coverColor} onClick={() => patchSettings({ coverColor: null })} label="Avtomatik">
                  <span className="text-xs font-bold">A</span>
                </Swatch>
                {COVER_PALETTE.map((c) => (
                  <Swatch key={c} active={settings.coverColor === c} onClick={() => patchSettings({ coverColor: c })} label={c} color={c} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Vaxt (dəq)" htmlFor="qs-time" error={sErrors.timeLimitMin}>
                <Input id="qs-time" type="number" min={1} inputMode="numeric" value={settings.timeLimitMin} onChange={(e) => patchSettings({ timeLimitMin: e.target.value })} placeholder="∞" />
              </Field>
              <Field label="Keçid %" htmlFor="qs-pass" error={sErrors.passPercent}>
                <Input id="qs-pass" type="number" min={0} max={100} inputMode="numeric" value={settings.passPercent} onChange={(e) => patchSettings({ passPercent: e.target.value })} />
              </Field>
              <Field label="Cəhd" htmlFor="qs-max" error={sErrors.maxAttempts}>
                <Input id="qs-max" type="number" min={1} inputMode="numeric" value={settings.maxAttempts} onChange={(e) => patchSettings({ maxAttempts: e.target.value })} placeholder="∞" />
              </Field>
            </div>
            <div className="space-y-3 rounded-2xl border border-line bg-surface p-3">
              <Switch size="sm" checked={settings.shuffleQuestions} onCheckedChange={(v) => patchSettings({ shuffleQuestions: v })} label="Sualları qarışdır" />
              <Switch size="sm" checked={settings.shuffleOptions} onCheckedChange={(v) => patchSettings({ shuffleOptions: v })} label="Variantları qarışdır" />
              <Switch size="sm" checked={settings.showAnswers} onCheckedChange={(v) => patchSettings({ showAnswers: v })} label="Sonda cavabları göstər" />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Status</p>
              <Segmented tabs={STATUS_TABS} value={settings.status} onChange={(v) => patchSettings({ status: v })} size="sm" fill />
            </div>
          </div>
        </Sheet>

        {/* Questions */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">
              Suallar <span className="hand text-2xl font-semibold text-muted">· {questions.length} sual, {totalPoints} bal</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" leftIcon={<Library />} onClick={() => setModal('bank')}>
                Bankdan
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Sparkles />} onClick={() => setModal('ai')}>
                AI ilə yarat
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<FileUp />} onClick={() => setModal('csv')}>
                CSV
              </Button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="paper-ruled mt-4 grid place-items-center rounded-3xl border-2 border-dashed border-line-strong bg-elev px-6 py-12 pl-14 text-center">
              <Mascot mode="peek" size={100} message="Gəl ilk sualı yazaq!" />
              <p className="hand mt-4 text-2xl text-muted">Hələ sual yoxdur</p>
            </div>
          ) : (
            <DndContext id="quiz-editor-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={questions.map((q) => q.key)} strategy={verticalListSortingStrategy}>
                <ol className="mt-4 space-y-3">
                  {questions.map((q, i) => (
                    <SortableRow key={q.key} id={q.key}>
                      {(handle) => (
                        <QuestionCard
                          n={i + 1}
                          d={q}
                          open={open === q.key}
                          error={qErrors[q.key] || null}
                          handle={handle}
                          onToggle={() => setOpen((o) => (o === q.key ? null : q.key))}
                          onChange={updateQuestion}
                          onDuplicate={() => duplicate(q)}
                          onRemove={() => remove(q)}
                        />
                      )}
                    </SortableRow>
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <div className="mt-4">
            <Menu
              align="start"
              trigger={
                <Button variant="secondary" leftIcon={<Plus />}>
                  Sual əlavə et
                </Button>
              }
              items={QUESTION_TYPES.map((t) => ({ label: QUESTION_TYPE_LABEL[t], onClick: () => addQuestion(t) }))}
            />
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-elev px-4 py-2.5 shadow-stamp">
          <span className={cn('hand truncate text-xl', dirty ? 'text-signal' : 'text-muted')}>
            {dirty ? '● saxlanmamış dəyişikliklər' : isNew ? 'hələ yadda saxlanmayıb' : '✓ hamısı saxlanılıb'}
          </span>
          <Button leftIcon={<Save />} loading={saving} disabled={!dirty && !isNew} onClick={() => void save()}>
            Yadda saxla
          </Button>
        </div>
      </div>

      <CsvImportModal open={modal === 'csv'} onClose={() => setModal(null)} onImport={onCsv} title="Testə CSV idxalı" />
      <BankPickerModal open={modal === 'bank'} onClose={() => setModal(null)} onPick={appendFromBank} />
      <AiGenerateModal open={modal === 'ai'} onClose={() => setModal(null)} onAccept={appendFromBank} />
      <VisibilityModal open={modal === 'vis'} onClose={() => setModal(null)} quiz={quiz ?? null} />
    </div>
  );
}

function Swatch({ active, onClick, label, color, children }: { active: boolean; onClick: () => void; label: string; color?: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn('grid size-8 place-items-center rounded-full border-2 transition-transform', active ? 'scale-110 border-ink shadow-stamp-sm' : 'border-line-strong hover:scale-105')}
      style={color ? { background: color } : undefined}
    >
      {children}
    </button>
  );
}

type Handle = { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners; isDragging: boolean };

function SortableRow({ id, children }: { id: string; children: (h: Handle) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} id={`qcard-${id}`} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn('relative scroll-mt-24', isDragging && 'z-20')}>
      {children({ attributes, listeners, isDragging })}
    </li>
  );
}

function QuestionCard({
  n,
  d,
  open,
  error,
  handle,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
}: {
  n: number;
  d: QDraft;
  open: boolean;
  error: string | null;
  handle: Handle;
  onToggle: () => void;
  onChange: (d: QDraft) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 bg-elev transition-shadow',
        open ? 'border-ink shadow-stamp' : 'border-line hover:border-ink/50',
        error && 'border-danger',
        handle.isDragging && 'rotate-[-0.6deg] shadow-[6px_6px_0_0_var(--ink)]',
      )}
    >
      <div className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
        <button
          type="button"
          aria-label={`${n}-ci sualı sürüklə`}
          className="cursor-grab touch-none rounded-lg p-1.5 text-subtle hover:bg-fg/5 hover:text-fg active:cursor-grabbing"
          {...handle.attributes}
          {...handle.listeners}
        >
          <GripVertical className="size-5" />
        </button>
        <span className="hand w-7 shrink-0 text-center text-2xl text-signal">{n}.</span>
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left" aria-expanded={open}>
          <span className="min-w-0 flex-1">
            <span className={cn('block truncate font-semibold', !d.text.trim() && 'italic text-subtle')}>
              {d.text.trim() ? plainQuestionText(d) : 'Mətn yoxdur'}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="glacier">{QUESTION_TYPE_LABEL[d.type]}</Badge>
              <span className="text-xs text-muted">{d.points} bal</span>
              {error && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
                  <AlertTriangle className="size-3.5" /> {error}
                </span>
              )}
            </span>
          </span>
          <ChevronDown className={cn('size-5 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
        </button>
        <div className="hidden shrink-0 sm:flex">
          <IconButton label="Surətini çıxar" variant="ghost" size="sm" onClick={onDuplicate}>
            <Copy />
          </IconButton>
          <IconButton label="Sualı sil" variant="danger" size="sm" onClick={onRemove}>
            <Trash2 />
          </IconButton>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t-2 border-dashed border-line px-3 pb-4 pt-4 sm:px-5">
              <QuestionEditor value={d} onChange={onChange} error={error} />
              <div className="mt-4 flex justify-end gap-2 sm:hidden">
                <Button variant="ghost" size="sm" leftIcon={<Copy />} onClick={onDuplicate}>
                  Surət
                </Button>
                <Button variant="danger" size="sm" leftIcon={<Trash2 />} onClick={onRemove}>
                  Sil
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
