'use client';

import { useMemo, useState } from 'react';
import { FileUp, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { Badge, Button, Checkbox, IconButton, Input, Modal, Select, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Mascot } from '@/components/brand/Mascot';
import { cn } from '@/lib/utils';
import { useBank, useBankTags, useBankToQuiz, useDeleteBankQuestion, useImportBankCsv, useQuizzes, useSaveBankQuestion } from '../../hooks';
import { DIFFICULTY_LABEL, QUESTION_TYPES, QUESTION_TYPE_LABEL } from '../../lib/constants';
import { correctText } from '../../lib/review';
import { errorMessage, plainQuestionText } from '../../lib/utils';
import type { BankQuestion, QuestionType } from '../../types';
import { blankDraft, toBankDraft, toDraft, validateDraft, type QDraft } from './draft';
import { QuestionEditor } from './QuestionEditor';
import { AiGenerateModal, CsvImportModal } from './StudioModals';
import { ConfirmModal, StudioHeader } from './parts';

const DIFF_TONE = { 1: 'moss', 2: 'ember', 3: 'danger' } as const;

export function BankScreen() {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState<QuestionType | ''>('');
  const { data, isLoading, isFetching } = useBank({ q: q.trim() || undefined, tag: tag || undefined, type });
  const tags = useBankTags();
  const save = useSaveBankQuestion();
  const del = useDeleteBankQuestion();
  const importCsv = useImportBankCsv();
  const toQuiz = useBankToQuiz();
  const quizzes = useQuizzes({ mine: true });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetQuiz, setTargetQuiz] = useState('');
  const [editing, setEditing] = useState<QDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BankQuestion | null>(null);
  const [modal, setModal] = useState<null | 'csv' | 'ai'>(null);

  const list = useMemo(() => data ?? [], [data]);
  const allSelected = list.length > 0 && list.every((x) => selected.has(x.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const saveEdit = async () => {
    if (!editing) return;
    const err = validateDraft(editing);
    setEditError(err);
    if (err) return;
    try {
      await save.mutateAsync(toBankDraft(editing));
      toast.success(editing.id ? 'Sual yeniləndi' : 'Sual banka əlavə edildi');
      setEditing(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      setSelected((s) => {
        const n = new Set(s);
        n.delete(toDelete.id);
        return n;
      });
      toast.success('Sual silindi');
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const addToQuiz = async () => {
    if (!targetQuiz || !selected.size) return;
    try {
      await toQuiz.mutateAsync({ questionIds: [...selected], quizId: targetQuiz });
      const title = quizzes.data?.find((x) => x.id === targetQuiz)?.title ?? 'testə';
      toast.success(`${selected.size} sual “${title}” testinə əlavə edildi`);
      setSelected(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const saveAi = async (qs: BankQuestion[]) => {
    let ok = 0;
    for (const bq of qs) {
      try {
        await save.mutateAsync(toBankDraft(toDraft(bq, false)));
        ok++;
      } catch {
        /* keep going */
      }
    }
    if (ok) toast.success(`${ok} sual banka əlavə edildi`);
    if (ok < qs.length) toast.error(`${qs.length - ok} sual saxlanmadı`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6">
      <StudioHeader
        back={{ href: '/studio', label: 'studiya' }}
        eyebrow="hazır suallar"
        title="Sual"
        accent="bankı"
        description="Sualları bir dəfə yaz, istənilən testdə təkrar istifadə et."
        actions={
          <>
            <Button variant="ghost" size="sm" leftIcon={<FileUp />} onClick={() => setModal('csv')}>
              CSV
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Sparkles />} onClick={() => setModal('ai')}>
              AI ilə yarat
            </Button>
            <Button
              size="sm"
              leftIcon={<Plus />}
              onClick={() => {
                setEditError(null);
                setEditing(blankDraft('SINGLE'));
              }}
            >
              Yeni sual
            </Button>
          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_12rem_12rem]">
        <Input leftIcon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sual mətnində axtar…" />
        <Select value={tag} onChange={(e) => setTag(e.target.value)} options={[{ value: '', label: 'Bütün teqlər' }, ...(tags.data ?? []).map((t) => ({ value: t, label: `#${t}` }))]} />
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType | '')}
          options={[{ value: '', label: 'Bütün tiplər' }, ...QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABEL[t] }))]}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Checkbox
          checked={allSelected}
          disabled={!list.length}
          onCheckedChange={(c) => setSelected(c ? new Set(list.map((x) => x.id)) : new Set())}
          label={<span className="text-sm font-semibold">Hamısını seç</span>}
        />
        <span className={cn('hand text-xl text-muted', isFetching && 'animate-pulse')}>{list.length} sual</span>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : !list.length ? (
          <div className="paper-ruled grid place-items-center rounded-3xl border-2 border-dashed border-line-strong bg-elev px-6 py-14 pl-14 text-center">
            <Mascot mode="peek" size={110} message={q || tag || type ? 'Bu filtrlə heç nə yoxdur' : 'Bank hələ boşdur'} />
            <p className="hand mt-5 text-2xl text-muted">Sual əlavə et, CSV yüklə və ya AI-dan kömək al</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((bq) => {
              const on = selected.has(bq.id);
              const answer = bq.type === 'OPEN' ? 'Müəllim yoxlayır' : correctText(bq);
              return (
                <li
                  key={bq.id}
                  className={cn(
                    'flex gap-3 rounded-2xl border-2 bg-elev px-3 py-3 transition-colors sm:px-4',
                    on ? 'border-ink bg-ember/10 shadow-stamp-sm' : 'border-line hover:border-ink/50',
                  )}
                >
                  <div className="pt-0.5">
                    <Checkbox checked={on} onCheckedChange={() => toggle(bq.id)} aria-label="Seç" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{plainQuestionText(bq)}</p>
                    {answer && (
                      <p className="mt-1 truncate text-sm text-muted">
                        <span className="hand text-base text-moss">cavab:</span> {answer}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone="glacier">{QUESTION_TYPE_LABEL[bq.type]}</Badge>
                      <Badge tone={DIFF_TONE[bq.difficulty as 1 | 2 | 3] ?? 'neutral'}>{DIFFICULTY_LABEL[bq.difficulty] ?? bq.difficulty}</Badge>
                      <span className="text-xs text-muted">{bq.points} bal</span>
                      {bq.tags.map((t) => (
                        <button key={t} type="button" onClick={() => setTag(t)} className="text-xs font-semibold text-signal hover:underline">
                          #{t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <IconButton
                      label="Redaktə et"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditError(null);
                        setEditing(toDraft(bq));
                      }}
                    >
                      <Pencil />
                    </IconButton>
                    <IconButton label="Sil" variant="danger" size="sm" onClick={() => setToDelete(bq)}>
                      <Trash2 />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl border-2 border-ink bg-elev px-3 py-2.5 shadow-stamp sm:flex-nowrap sm:px-4">
            <span className="hand text-xl">{selected.size} seçildi</span>
            <IconButton label="Seçimi təmizlə" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X />
            </IconButton>
            <Select
              value={targetQuiz}
              onChange={(e) => setTargetQuiz(e.target.value)}
              placeholder="Test seç…"
              options={(quizzes.data ?? []).map((x) => ({ value: x.id, label: x.title }))}
              wrapperClassName="min-w-0 flex-1 basis-40"
              selectSize="sm"
            />
            <Button size="sm" disabled={!targetQuiz} loading={toQuiz.isPending} onClick={addToQuiz}>
              Testə əlavə et
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Sualı redaktə et' : 'Yeni bank sualı'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Ləğv et
            </Button>
            <Button loading={save.isPending} onClick={saveEdit}>
              Yadda saxla
            </Button>
          </>
        }
      >
        {editing && (
          <QuestionEditor
            value={editing}
            onChange={(d) => {
              setEditing(d);
              if (editError) setEditError(validateDraft(d));
            }}
            error={editError}
            showDifficulty
            tagSuggestions={tags.data}
          />
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        loading={del.isPending}
        title="Sualı bankdan silək?"
        description="Testlərə əvvəl əlavə olunmuş surətlər qalacaq."
      />
      <CsvImportModal open={modal === 'csv'} onClose={() => setModal(null)} onImport={(f) => importCsv.mutateAsync(f)} title="Banka CSV idxalı" />
      <AiGenerateModal open={modal === 'ai'} onClose={() => setModal(null)} onAccept={saveAi} acceptLabel="Banka əlavə et" />
    </div>
  );
}
