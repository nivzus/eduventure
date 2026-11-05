'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Eye, Globe, GripVertical, ImagePlus, KeyRound, Lock, Save, Users, X } from 'lucide-react';
import { Badge, Button, ButtonLink, Checkbox, Input, Modal, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Note } from '@/components/notebook';
import { Mascot } from '@/components/brand/Mascot';
import { RequireRole } from '@/lib/auth';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useGroupOptions, useSetVisibility, useUpload } from '../hooks';
import { STATUS_META, VISIBILITY_META } from '../lib/content-meta';
import type { ContentStatus, ContentType, Visibility } from '../types';

// ───────────────────────────── basics ─────────────────────────────

export const uid = () => Math.random().toString(36).slice(2, 10);

export function StudioGuard({ children }: { children: ReactNode }) {
  return <RequireRole roles={['TEACHER', 'ADMIN']}>{children}</RequireRole>;
}

export function StatusBadge({ status }: { status: ContentStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.DRAFT;
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

export const VIS_ICON: Record<Visibility, typeof Globe> = { PUBLIC: Globe, PRIVATE: Lock, GROUPS: Users, PASSCODE: KeyRound };

/** Hand-labelled paper panel used for editor sections. */
export function Panel({ label, children, className, right }: { label: ReactNode; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cn('rounded-3xl border-2 border-ink bg-elev p-4 shadow-stamp sm:p-5', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="hand text-2xl leading-none text-fg">{label}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

// ───────────────────────────── editor state + guard ─────────────────────────────

const LEAVE_MSG = 'Yadda saxlanmamış dəyişikliklər var. Səhifədən çıxılsın?';

/** Warns on tab close / in-app link navigation while `dirty`. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(LEAVE_MSG)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBefore);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBefore);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}

export function useEditorState<T>(initial: T) {
  const [form, setForm] = useState<T>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(form) !== baseline;
  useUnsavedGuard(dirty);
  return {
    form,
    setForm,
    patch: (p: Partial<T>) => setForm((f) => ({ ...f, ...p })),
    dirty,
    markSaved: () => setBaseline(JSON.stringify(form)),
  };
}

// ───────────────────────────── editor shell ─────────────────────────────

export function EditorShell({
  backHref,
  backLabel,
  kind,
  title,
  status,
  isNew,
  dirty,
  saving,
  onSave,
  viewHref,
  children,
}: {
  backHref: string;
  backLabel: string;
  kind: string;
  title: string;
  status: ContentStatus;
  isNew: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  viewHref?: string;
  children: ReactNode;
}) {
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
      <div className="sticky top-16 z-20 -mx-4 mb-6 flex items-center gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:gap-3 sm:px-6">
        <Link href={backHref} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-muted hover:bg-fg/[0.06] hover:text-fg" aria-label={backLabel}>
          <ArrowLeft className="size-4" />
          <span className="hand hidden text-xl md:inline">{backLabel}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="hand text-lg leading-none text-signal">{isNew ? `yeni ${kind}` : kind}</span>
            <span className="hidden sm:inline-flex"><StatusBadge status={status} /></span>
          </div>
          <div className="truncate font-display text-[15px] font-semibold sm:text-base">{title.trim() || 'Adsız'}</div>
        </div>
        {dirty && <span className="hand hidden shrink-0 text-lg text-ember sm:inline">yadda saxlanmayıb</span>}
        {viewHref && !isNew && (
          <ButtonLink href={viewHref} variant="ghost" size="sm" leftIcon={<Eye />} className="hidden sm:inline-flex">
            Bax
          </ButtonLink>
        )}
        <Button size="sm" leftIcon={<Save />} loading={saving} onClick={onSave} className={cn(dirty && 'ring-2 ring-ember/60')}>
          {isNew ? 'Yarat' : 'Saxla'}
        </Button>
      </div>
      {children}
    </div>
  );
}

export function EditorNotFound({ backHref, label }: { backHref: string; label: string }) {
  return (
    <div className="grid place-items-center px-4 py-20 text-center">
      <Mascot mode="sad" size={110} />
      <h1 className="mt-6 text-3xl">Tapılmadı</h1>
      <p className="hand mt-2 text-xl text-muted">Ola bilər ki, silinib və ya sizə aid deyil.</p>
      <ButtonLink href={backHref} className="mt-6">{label}</ButtonLink>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
      <Skeleton className="h-12 rounded-2xl" />
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}

/** Big notebook-sheet title + description inputs at the top of each editor. */
export function TitleSheet({
  title,
  onTitle,
  description,
  onDescription,
  descLabel = 'Qısa təsvir',
  placeholder,
  children,
}: {
  title: string;
  onTitle: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  descLabel?: string;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <section className="paper-ruled relative rounded-3xl border-2 border-ink bg-elev p-5 pl-14 shadow-stamp sm:p-8 sm:pl-20">
      <Note className="text-xl !text-signal">başlıq</Note>
      <textarea
        value={title}
        onChange={(e) => onTitle(e.target.value.replace(/\n/g, ' '))}
        placeholder={placeholder}
        rows={1}
        maxLength={200}
        aria-label="Başlıq"
        className="mt-1 block w-full resize-none bg-transparent font-display text-3xl font-semibold leading-tight outline-none [field-sizing:content] placeholder:text-subtle sm:text-4xl"
      />
      <Note className="mt-4 text-xl !text-muted">{descLabel}</Note>
      <textarea
        value={description}
        onChange={(e) => onDescription(e.target.value)}
        placeholder="Bir-iki cümlə ilə nədən bəhs etdiyini yaz…"
        rows={2}
        maxLength={4000}
        aria-label={descLabel}
        className="mt-1 block w-full resize-none bg-transparent text-lg leading-8 text-muted outline-none [field-sizing:content] placeholder:text-subtle"
      />
      {children}
    </section>
  );
}

// ───────────────────────────── status + visibility ─────────────────────────────

const STATUSES: ContentStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export function StatusPicker({ value, onChange }: { value: ContentStatus; onChange: (v: ContentStatus) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Status">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => onChange(s)}
          className={cn(
            'rounded-xl border-2 px-2 py-2 text-[13px] font-semibold transition',
            value === s ? 'border-ink bg-signal text-signal-fg shadow-stamp-sm' : 'border-line text-muted hover:border-line-strong hover:text-fg',
          )}
        >
          {STATUS_META[s].label}
        </button>
      ))}
    </div>
  );
}

export interface VisibilityValue {
  visibility: Visibility;
  passcode: string;
  groupIds: string[];
}

export function visibilityError(v: VisibilityValue): string | null {
  if (v.visibility === 'PASSCODE' && !v.passcode.trim()) return 'Şifrəli giriş üçün şifrə yazın';
  if (v.visibility === 'GROUPS' && !v.groupIds.length) return 'Ən azı bir qrup seçin';
  return null;
}

export function visibilityBody(v: VisibilityValue) {
  return {
    visibility: v.visibility,
    passcode: v.visibility === 'PASSCODE' ? v.passcode.trim() : null,
    groupIds: v.visibility === 'GROUPS' ? v.groupIds : [],
  };
}

export function VisibilityFields({ value, onChange }: { value: VisibilityValue; onChange: (v: VisibilityValue) => void }) {
  const groups = useGroupOptions(value.visibility === 'GROUPS');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Görünmə">
        {(Object.keys(VISIBILITY_META) as Visibility[]).map((v) => {
          const Icon = VIS_ICON[v];
          const on = value.visibility === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange({ ...value, visibility: v })}
              className={cn(
                'flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left text-[13px] font-semibold transition',
                on ? 'border-ink bg-ember/25 shadow-stamp-sm' : 'border-line text-muted hover:border-line-strong hover:text-fg',
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="leading-tight">{VISIBILITY_META[v].label}</span>
            </button>
          );
        })}
      </div>
      {value.visibility === 'PASSCODE' && (
        <Input
          value={value.passcode}
          onChange={(e) => onChange({ ...value, passcode: e.target.value })}
          placeholder="Şifrə (məs. ingilis2026)"
          maxLength={64}
          leftIcon={<KeyRound className="size-4" />}
          aria-label="Şifrə"
        />
      )}
      {value.visibility === 'GROUPS' && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-line p-2">
          {groups.isLoading ? (
            <Skeleton className="h-8 rounded-xl" />
          ) : !groups.data?.length ? (
            <p className="hand px-2 py-1 text-lg text-muted">Hələ qrupunuz yoxdur</p>
          ) : (
            groups.data.map((g) => (
              <Checkbox
                key={g.id}
                label={g.name}
                checked={value.groupIds.includes(g.id)}
                onCheckedChange={(c) =>
                  onChange({ ...value, groupIds: c ? [...value.groupIds, g.id] : value.groupIds.filter((x) => x !== g.id) })
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Quick visibility change from list pages (PATCH /content/:type/:id/visibility). */
export function VisibilityModal({
  open,
  onClose,
  type,
  item,
}: {
  open: boolean;
  onClose: () => void;
  type: ContentType;
  item: { id: string; title: string; visibility: Visibility; passcode?: string | null; groupIds?: string[] } | null;
}) {
  const qc = useQueryClient();
  const setVis = useSetVisibility();
  const [v, setV] = useState<VisibilityValue>({ visibility: 'PUBLIC', passcode: '', groupIds: [] });
  useEffect(() => {
    if (item) setV({ visibility: item.visibility, passcode: item.passcode ?? '', groupIds: item.groupIds ?? [] });
  }, [item]);

  const submit = async () => {
    if (!item) return;
    const err = visibilityError(v);
    if (err) return toast.error(err);
    try {
      await setVis.mutateAsync({ type, id: item.id, ...visibilityBody(v) });
      await qc.invalidateQueries({ queryKey: ['learn'] });
      toast.success('Görünmə yeniləndi');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'Görünməni dəyişmək alınmadı'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kim görə bilər?"
      description={item ? `«${item.title}»` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Ləğv et</Button>
          <Button loading={setVis.isPending} onClick={submit}>Yadda saxla</Button>
        </>
      }
    >
      <VisibilityFields value={v} onChange={setV} />
    </Modal>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  loading,
  confirmLabel = 'Sil',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  loading?: boolean;
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Ləğv et</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    />
  );
}

// ───────────────────────────── cover / tags ─────────────────────────────

export function CoverField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const upload = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [broken, setBroken] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Yalnız şəkil faylı seçin');
    if (file.size > 5 * 1024 * 1024) return toast.error('Şəkil 5 MB-dan böyük olmamalıdır');
    try {
      const r = await upload.mutateAsync(file);
      setBroken(false);
      onChange(r.url);
      toast.success('Örtük şəkli yükləndi');
    } catch {
      toast.error('Şəkli yükləmək alınmadı. Bir az sonra yenidən cəhd edin və ya şəklin linkini aşağıya yapışdırın.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-bg">
        {value && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Örtük" className="size-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="paper-dots grid size-full place-items-center text-muted hover:text-fg"
          >
            <span className="flex flex-col items-center gap-1">
              <ImagePlus className="size-7" />
              <span className="hand text-xl">{broken ? 'şəkil açılmadı' : 'örtük şəkli əlavə et'}</span>
            </span>
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setBroken(false);
            }}
            aria-label="Örtüyü sil"
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border-2 border-ink bg-elev shadow-stamp-sm"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex gap-2">
        <Input
          inputSize="sm"
          value={value}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
          placeholder="https://… şəkil linki"
          aria-label="Örtük şəklinin linki"
          wrapperClassName="flex-1 min-w-0"
        />
        <Button size="sm" variant="secondary" loading={upload.isPending} onClick={() => fileRef.current?.click()} leftIcon={<ImagePlus />}>
          Yüklə
        </Button>
      </div>
    </div>
  );
}

export function TagInput({ value, onChange, placeholder = 'teq yaz, Enter' }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.includes(p) && next.length < 30) next.push(p);
    onChange(next);
    setDraft('');
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[14px] border border-line bg-bg px-2 py-1.5 focus-within:border-signal">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ember/30 py-0.5 pl-2.5 pr-1 text-xs font-bold">
          #{t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`${t} teqini sil`} className="rounded-full p-0.5 hover:bg-fg/10">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (draft.trim()) add(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? '' : placeholder}
        aria-label="Teqlər"
        className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle"
      />
    </div>
  );
}

// ───────────────────────────── drag & drop ─────────────────────────────

export function SortableList<T extends { key: string }>({
  items,
  onReorder,
  grid,
  className,
  children,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  grid?: boolean;
  className?: string;
  children: (item: T, index: number) => ReactNode;
}) {
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.key === active.id);
    const to = items.findIndex((i) => i.key === over.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.key)} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>{items.map((it, i) => children(it, i))}</div>
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({ id, className, children }: { id: string; className?: string; children: (handle: ReactNode, dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Sırasını dəyiş (sürüşdür)"
      className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-subtle hover:bg-fg/[0.06] hover:text-fg active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 rotate-[0.6deg] opacity-95', className)}
    >
      {children(handle, isDragging)}
    </div>
  );
}
