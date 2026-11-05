'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCourses, usePath, useSavePath } from '../hooks';
import { courseItemCount, pathCourses } from '../lib/normalize';
import type { ContentStatus, LearningPath, PathInput } from '../types';
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
  useEditorState,
  visibilityBody,
  visibilityError,
} from './ui';

interface CourseRow {
  key: string;
  title: string;
  sub?: string;
}

interface PathForm extends VisibilityValue {
  title: string;
  description: string;
  coverUrl: string;
  status: ContentStatus;
  /** key = course id */
  courses: CourseRow[];
}

const EMPTY: PathForm = { title: '', description: '', coverUrl: '', status: 'DRAFT', courses: [], visibility: 'PUBLIC', passcode: '', groupIds: [] };

const fromPath = (p: LearningPath): PathForm => ({
  title: p.title ?? '',
  description: p.description ?? '',
  coverUrl: p.coverUrl ?? '',
  status: p.status,
  courses: pathCourses(p).map((c) => ({ key: c.id, title: c.title, sub: [c.level, `${courseItemCount(c)} addım`].filter(Boolean).join(' · ') })),
  visibility: p.visibility,
  passcode: p.passcode ?? '',
  groupIds: p.groupIds ?? [],
});

export function PathEditorScreen({ id }: { id: string }) {
  const isNew = id === 'new';
  const q = usePath(isNew ? undefined : id);
  return (
    <StudioGuard>
      {isNew ? (
        <PathEditor id={id} initial={EMPTY} />
      ) : q.isLoading ? (
        <EditorSkeleton />
      ) : q.isError || !q.data ? (
        <EditorNotFound backHref="/studio/paths" label="Mənim yollarım" />
      ) : (
        <PathEditor key={q.data.id} id={q.data.id} initial={fromPath(q.data)} />
      )}
    </StudioGuard>
  );
}

function PathEditor({ id, initial }: { id: string; initial: PathForm }) {
  const isNew = id === 'new';
  const router = useRouter();
  const save = useSavePath();
  const { form, patch, dirty, markSaved } = useEditorState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const mine = useCourses({ mine: true });
  const all = useCourses();

  const groups = useMemo(
    () => [
      {
        value: 'COURSE',
        label: 'Kurslar',
        loading: mine.isLoading,
        options: mergeById(mine.data, all.data).map<PickOption>((c) => ({
          type: 'COURSE',
          id: c.id,
          title: c.title,
          sub: [c.level, c.category, `${courseItemCount(c)} addım`].filter(Boolean).join(' · '),
          status: c.status,
        })),
      },
    ],
    [mine.data, all.data, mine.isLoading],
  );
  const existing = useMemo(() => new Set(form.courses.map((c) => `COURSE:${c.key}`)), [form.courses]);

  const onSave = async () => {
    if (save.isPending) return;
    if (!form.title.trim()) return toast.error('Yolun adını yazın');
    const vErr = visibilityError(form);
    if (vErr) return toast.error(vErr);
    const body: PathInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      coverUrl: form.coverUrl.trim() || null,
      status: form.status,
      courseIds: form.courses.map((c) => c.key),
      ...visibilityBody(form),
    };
    try {
      const saved = await save.mutateAsync({ id: isNew ? undefined : id, body });
      markSaved();
      toast.success(isNew ? 'Öyrənmə yolu yaradıldı' : 'Yadda saxlandı');
      if (isNew) router.replace(`/studio/paths/${saved.id}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Yadda saxlamaq alınmadı'));
    }
  };

  return (
    <EditorShell
      backHref="/studio/paths"
      backLabel="yollarım"
      kind="yol"
      title={form.title}
      status={form.status}
      isNew={isNew}
      dirty={dirty}
      saving={save.isPending}
      onSave={onSave}
      viewHref={`/paths/${id}`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <TitleSheet
            title={form.title}
            onTitle={(title) => patch({ title })}
            description={form.description}
            onDescription={(description) => patch({ description })}
            descLabel="təsvir"
            placeholder="Yolun adı… (məs. B1 səviyyəsinə yol)"
          />

          <Panel
            label={`Kurslar · ${form.courses.length}`}
            right={
              <Button size="sm" leftIcon={<Plus />} onClick={() => setPickerOpen(true)}>
                Kurs əlavə et
              </Button>
            }
          >
            {!form.courses.length ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="paper-dots grid w-full place-items-center rounded-2xl border-2 border-dashed border-line-strong px-4 py-10 text-center text-muted hover:border-ink hover:text-fg"
              >
                <span className="hand text-2xl">Səyahətin ilk kursunu seç →</span>
              </button>
            ) : (
              <div className="relative">
                <span aria-hidden className="absolute bottom-6 left-[71px] sm:left-[75px] top-6 w-[3px] rounded-full bg-[repeating-linear-gradient(180deg,var(--border-strong)_0_4px,transparent_4px_10px)]" />
                <SortableList items={form.courses} onReorder={(courses) => patch({ courses })} className="relative space-y-2.5">
                  {(c, i) => (
                    <SortableItem key={c.key} id={c.key}>
                      {(handle, dragging) => (
                        <div className={cn('flex items-center gap-2 rounded-2xl border bg-elev p-2 pr-2.5 sm:gap-3', dragging ? 'border-2 border-ink shadow-stamp' : 'border-line')}>
                          {handle}
                          <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-signal font-display text-sm font-bold text-signal-fg shadow-stamp-sm">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate font-semibold">
                              <GraduationCap className="size-4 shrink-0 text-muted" />
                              <span className="truncate">{c.title}</span>
                            </div>
                            {c.sub && <div className="truncate text-xs text-muted">{c.sub}</div>}
                          </div>
                          <IconButton
                            label="Kursu çıxar"
                            icon={<Trash2 className="size-4" />}
                            className="text-danger"
                            onClick={() => patch({ courses: form.courses.filter((x) => x.key !== c.key) })}
                          />
                        </div>
                      )}
                    </SortableItem>
                  )}
                </SortableList>
                <div className="hand mt-3 flex items-center gap-2 pl-[52px] text-xl text-muted">
                  <Flag className="size-4" /> finiş — yol tamamlandı
                </div>
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel label="Dərc və görünmə">
            <StatusPicker value={form.status} onChange={(status) => patch({ status })} />
            <div className="mt-4">
              <VisibilityFields value={form} onChange={(v) => patch(v)} />
            </div>
          </Panel>
          <Panel label="Örtük şəkli">
            <CoverField value={form.coverUrl} onChange={(coverUrl) => patch({ coverUrl })} />
          </Panel>
        </aside>
      </div>

      <PickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Yola kurs əlavə et"
        groups={groups}
        existing={existing}
        onAdd={(picked) => patch({ courses: [...form.courses, ...picked.map((p) => ({ key: p.id, title: p.title, sub: p.sub }))] })}
      />
    </EditorShell>
  );
}
