'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Input } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useArticles, useCourse, useDecks, useQuizOptions, useSaveCourse } from '../hooks';
import { ITEM_META } from '../lib/content-meta';
import { deckCardCount, itemSummary, questionCountOf } from '../lib/normalize';
import type { Course, CourseInput, CourseItemType, ContentStatus } from '../types';
import { PickerModal, mergeById, type PickOption } from './Picker';
import {
  CoverField,
  EditorNotFound,
  EditorShell,
  EditorSkeleton,
  Panel,
  SortableItem,
  SortableList,
  StatusPicker,
  StudioGuard,
  TitleSheet,
  VisibilityFields,
  type VisibilityValue,
  uid,
  useEditorState,
  visibilityBody,
  visibilityError,
} from './ui';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

interface ItemRow {
  key: string;
  type: CourseItemType;
  refId: string;
  title: string;
  sub?: string;
}

interface CourseForm extends VisibilityValue {
  title: string;
  description: string;
  level: string;
  category: string;
  coverUrl: string;
  status: ContentStatus;
  items: ItemRow[];
}

const EMPTY: CourseForm = {
  title: '',
  description: '',
  level: '',
  category: '',
  coverUrl: '',
  status: 'DRAFT',
  items: [],
  visibility: 'PUBLIC',
  passcode: '',
  groupIds: [],
};

const fromCourse = (c: Course): CourseForm => ({
  title: c.title ?? '',
  description: c.description ?? '',
  level: c.level ?? '',
  category: c.category ?? '',
  coverUrl: c.coverUrl ?? '',
  status: c.status,
  items: [...(c.items ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((it) => {
      const s = itemSummary(it);
      return {
        key: it.id,
        type: it.type,
        refId: it.articleId ?? it.quizId ?? it.deckId ?? s?.id ?? '',
        title: it.title ?? s?.title ?? ITEM_META[it.type].label,
      };
    }),
  visibility: c.visibility,
  passcode: c.passcode ?? '',
  groupIds: c.groupIds ?? [],
});

export function CourseEditorScreen({ id }: { id: string }) {
  const isNew = id === 'new';
  const q = useCourse(isNew ? undefined : id);
  return (
    <StudioGuard>
      {isNew ? (
        <CourseEditor id={id} initial={EMPTY} />
      ) : q.isLoading ? (
        <EditorSkeleton />
      ) : q.isError || !q.data ? (
        <EditorNotFound backHref="/studio/courses" label="Mənim kurslarım" />
      ) : (
        <CourseEditor key={q.data.id} id={q.data.id} initial={fromCourse(q.data)} />
      )}
    </StudioGuard>
  );
}

function CourseEditor({ id, initial }: { id: string; initial: CourseForm }) {
  const isNew = id === 'new';
  const router = useRouter();
  const save = useSaveCourse();
  const { form, patch, dirty, markSaved } = useEditorState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);

  const articlesMine = useArticles({ mine: true });
  const articlesAll = useArticles();
  const quizzes = useQuizOptions();
  const decksMine = useDecks({ mine: true });
  const decksAll = useDecks();

  const groups = useMemo(
    () => [
      {
        value: 'ARTICLE',
        label: 'Məqalələr',
        loading: articlesMine.isLoading,
        options: mergeById(articlesMine.data, articlesAll.data).map<PickOption>((a) => ({
          type: 'ARTICLE',
          id: a.id,
          title: a.title,
          sub: [a.category, `${a.readingMinutes ?? 1} dəq`].filter(Boolean).join(' · '),
          status: a.status,
        })),
      },
      {
        value: 'QUIZ',
        label: 'Testlər',
        loading: quizzes.isLoading,
        options: (quizzes.data ?? []).map<PickOption>((x) => {
          const n = questionCountOf(x);
          return { type: 'QUIZ', id: x.id, title: x.title, sub: [x.category, n ? `${n} sual` : null].filter(Boolean).join(' · '), status: x.status };
        }),
      },
      {
        value: 'DECK',
        label: 'Kartlar',
        loading: decksMine.isLoading,
        options: mergeById(decksMine.data, decksAll.data).map<PickOption>((d) => ({
          type: 'DECK',
          id: d.id,
          title: d.title,
          sub: [d.category, `${deckCardCount(d)} kart`].filter(Boolean).join(' · '),
          status: d.status,
        })),
      },
    ],
    [articlesMine.data, articlesAll.data, articlesMine.isLoading, quizzes.data, quizzes.isLoading, decksMine.data, decksAll.data, decksMine.isLoading],
  );
  const existing = useMemo(() => new Set(form.items.map((i) => `${i.type}:${i.refId}`)), [form.items]);

  const onSave = async () => {
    if (save.isPending) return;
    if (!form.title.trim()) return toast.error('Kursun adını yazın');
    const vErr = visibilityError(form);
    if (vErr) return toast.error(vErr);
    const body: CourseInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      level: form.level || null,
      category: form.category.trim() || null,
      coverUrl: form.coverUrl.trim() || null,
      status: form.status,
      items: form.items.map((i) =>
        i.type === 'ARTICLE' ? { type: i.type, articleId: i.refId } : i.type === 'QUIZ' ? { type: i.type, quizId: i.refId } : { type: i.type, deckId: i.refId },
      ),
      ...visibilityBody(form),
    };
    try {
      const saved = await save.mutateAsync({ id: isNew ? undefined : id, body });
      markSaved();
      toast.success(isNew ? 'Kurs yaradıldı' : 'Yadda saxlandı');
      if (isNew) router.replace(`/studio/courses/${saved.id}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Yadda saxlamaq alınmadı'));
    }
  };

  return (
    <EditorShell
      backHref="/studio/courses"
      backLabel="kurslarım"
      kind="kurs"
      title={form.title}
      status={form.status}
      isNew={isNew}
      dirty={dirty}
      saving={save.isPending}
      onSave={onSave}
      viewHref={`/courses/${id}`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <TitleSheet
            title={form.title}
            onTitle={(title) => patch({ title })}
            description={form.description}
            onDescription={(description) => patch({ description })}
            descLabel="təsvir"
            placeholder="Kursun adı…"
          />

          <Panel
            label={`Marşrut · ${form.items.length} addım`}
            right={
              <Button size="sm" leftIcon={<Plus />} onClick={() => setPickerOpen(true)}>
                Addım əlavə et
              </Button>
            }
          >
            {!form.items.length ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="paper-dots grid w-full place-items-center rounded-2xl border-2 border-dashed border-line-strong px-4 py-10 text-center text-muted hover:border-ink hover:text-fg"
              >
                <span className="hand text-2xl">Məqalə, test və ya kart dəsti əlavə et →</span>
              </button>
            ) : (
              <SortableList items={form.items} onReorder={(items) => patch({ items })} className="space-y-2.5">
                {(it, i) => {
                  const M = ITEM_META[it.type];
                  return (
                    <SortableItem key={it.key} id={it.key}>
                      {(handle, dragging) => (
                        <div className={cn('flex items-center gap-2 rounded-2xl border bg-bg/60 p-2 pr-2.5 sm:gap-3', dragging ? 'border-2 border-ink shadow-stamp' : 'border-line')}>
                          {handle}
                          <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-elev shadow-stamp-sm">
                            <M.icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="hand text-base leading-none text-muted">
                              {i + 1}. {M.label}
                            </div>
                            <div className="truncate font-semibold">{it.title}</div>
                          </div>
                          <IconButton
                            label="Addımı sil"
                            icon={<Trash2 className="size-4" />}
                            className="text-danger"
                            onClick={() => patch({ items: form.items.filter((x) => x.key !== it.key) })}
                          />
                        </div>
                      )}
                    </SortableItem>
                  );
                }}
              </SortableList>
            )}
            {form.items.length > 1 && <p className="hand mt-3 text-lg text-subtle">↕ sırasını dəyişmək üçün tutub sürüşdür</p>}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel label="Dərc və görünmə">
            <StatusPicker value={form.status} onChange={(status) => patch({ status })} />
            <div className="mt-4">
              <VisibilityFields value={form} onChange={(v) => patch(v)} />
            </div>
          </Panel>
          <Panel label="Səviyyə və kateqoriya">
            <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Səviyyə">
              {['', ...LEVELS].map((l) => (
                <button
                  key={l || 'none'}
                  type="button"
                  role="radio"
                  aria-checked={form.level === l}
                  onClick={() => patch({ level: l })}
                  className={cn(
                    'h-9 rounded-xl border-2 text-[13px] font-bold transition',
                    form.level === l ? 'border-ink bg-ember/40 shadow-stamp-sm' : 'border-line text-muted hover:text-fg',
                  )}
                >
                  {l || '—'}
                </button>
              ))}
            </div>
            <Input className="mt-3" value={form.category} onChange={(e) => patch({ category: e.target.value })} placeholder="Kateqoriya (məs. Qrammatika)" maxLength={80} aria-label="Kateqoriya" />
          </Panel>
          <Panel label="Örtük şəkli">
            <CoverField value={form.coverUrl} onChange={(coverUrl) => patch({ coverUrl })} />
          </Panel>
        </aside>
      </div>

      <PickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Kursa addım əlavə et"
        description="Bir neçəsini birdən seçə bilərsən — sonra sırasını dəyişərsən."
        groups={groups}
        existing={existing}
        onAdd={(picked) =>
          patch({
            items: [...form.items, ...picked.map((p) => ({ key: uid(), type: p.type as CourseItemType, refId: p.id, title: p.title, sub: p.sub }))],
          })
        }
      />
    </EditorShell>
  );
}
