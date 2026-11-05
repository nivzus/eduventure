'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Avatar, Button, Checkbox, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { useDebounce } from '@/lib/hooks';
import { CONTENT_TYPE_LABEL, type ContentType } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { Group } from '@/features/community/types';
import { useAddMembers, useAllGroups, useContentOptions, useCreateAssignment, useCreateGroup, useUpdateGroup, useUsers } from '../hooks';

export const GROUP_COLORS = ['#FF8A1F', '#E8542A', '#9B7BFF', '#0A8FB5', '#15803D', '#D7263D', '#14131A'];

/* ─────────── create / edit group ─────────── */

export function GroupFormModal({ open, onClose, group, onSaved }: { open: boolean; onClose: () => void; group?: Group | null; onSaved?: (g: Group) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const create = useCreateGroup();
  const update = useUpdateGroup(group?.id ?? '');
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setDescription(group?.description ?? '');
    setColor(group?.color ?? GROUP_COLORS[0]);
  }, [open, group]);

  const submit = () => {
    const body = { name: name.trim(), description: description.trim() || null, color };
    if (body.name.length < 2) return toast.error('Qrup adı ən azı 2 simvol olmalıdır');
    const opts = {
      onSuccess: (g: Group) => {
        toast.success(group ? 'Qrup yeniləndi' : 'Qrup yaradıldı');
        onSaved?.(g);
        onClose();
      },
      onError: (e: unknown) => toast.error(errorMessage(e)),
    };
    if (group) update.mutate(body, opts);
    else create.mutate(body, opts);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? 'Qrupu redaktə et' : 'Yeni qrup'}
      description="Qrup tələbələri bir yerdə toplayır — tapşırıq və statistika üçün."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Ləğv et
          </Button>
          <Button onClick={submit} loading={pending}>
            {group ? 'Yadda saxla' : 'Yarat'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Ad" htmlFor="g-name" required>
          <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="məs. B1 — Axşam qrupu" autoFocus />
        </Field>
        <Field label="Təsvir" htmlFor="g-desc" hint="İstəyə bağlı: dərs günləri, səviyyə…">
          <Textarea id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <Field label="Rəng">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Qrup rəngi">
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn('grid size-9 place-items-center rounded-xl border-2 border-ink transition-transform', color === c ? 'shadow-stamp-sm -translate-y-0.5' : 'opacity-80 hover:opacity-100')}
                style={{ background: c }}
              >
                {color === c && <Check className="size-4 text-white" />}
              </button>
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}

/* ─────────── member picker ─────────── */

export function MemberPickerModal({ open, onClose, groupId, existing }: { open: boolean; onClose: () => void; groupId: string; existing: string[] }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q.trim(), 250);
  const { data, isLoading } = useUsers(dq, 'STUDENT');
  const add = useAddMembers(groupId);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const have = useMemo(() => new Set(existing), [existing]);
  const list = (data ?? []).filter((u) => !have.has(u.id));

  useEffect(() => {
    if (open) {
      setSel(new Set());
      setQ('');
    }
  }, [open]);

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Üzv əlavə et"
      description="Tələbələri seçin — onlar qrupun tapşırıqlarını görəcək."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={add.isPending}>
            Ləğv et
          </Button>
          <Button
            disabled={!sel.size}
            loading={add.isPending}
            onClick={() =>
              add.mutate([...sel], {
                onSuccess: () => {
                  toast.success(`${sel.size} üzv əlavə olundu`);
                  onClose();
                },
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          >
            {sel.size ? `${sel.size} nəfəri əlavə et` : 'Əlavə et'}
          </Button>
        </>
      }
    >
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tələbə axtar…" leftIcon={<Search className="size-4" />} aria-label="Tələbə axtar" />
      <ul className="mt-3 max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
        {isLoading ? (
          <li className="py-6 text-center text-sm text-subtle">Yüklənir…</li>
        ) : !list.length ? (
          <li className="hand py-6 text-center text-xl text-subtle">əlavə ediləcək tələbə yoxdur</li>
        ) : (
          list.map((u) => {
            const on = sel.has(u.id);
            return (
              <li key={u.id}>
                <label className={cn('flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 transition-colors', on ? 'border-ink bg-signal/15' : 'border-transparent hover:border-line')}>
                  <Checkbox checked={on} onCheckedChange={() => toggle(u.id)} aria-label={u.name} />
                  <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{u.name}</span>
                    <span className="block truncate text-xs text-muted">{u.email}</span>
                  </span>
                  <span className="font-mono text-xs text-subtle">{u.level} səv.</span>
                </label>
              </li>
            );
          })
        )}
      </ul>
    </Modal>
  );
}

/* ─────────── assign content ─────────── */

const TYPES: ContentType[] = ['QUIZ', 'ARTICLE', 'COURSE', 'PATH', 'DECK'];

export function AssignModal({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const [type, setType] = useState<ContentType>('QUIZ');
  const [contentId, setContentId] = useState('');
  const [due, setDue] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([groupId]);
  const content = useContentOptions(type, open);
  const groups = useAllGroups();
  const create = useCreateAssignment();

  useEffect(() => {
    if (open) {
      setGroupIds([groupId]);
      setContentId('');
      setDue('');
    }
  }, [open, groupId]);
  useEffect(() => setContentId(''), [type]);

  const submit = () => {
    if (!contentId) return toast.error('Məzmun seçin');
    if (!groupIds.length) return toast.error('Ən azı bir qrup seçin');
    create.mutate(
      { contentType: type, contentId, groupIds, dueAt: due ? new Date(due).toISOString() : null },
      {
        onSuccess: () => {
          toast.success('Tapşırıq verildi', { description: `${groupIds.length} qrupa bildiriş göndərildi` });
          onClose();
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tapşırıq ver"
      description="Test, məqalə, kurs, yol və ya kart dəstini qruplara tapşırın."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Ləğv et
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!contentId}>
            Tapşır
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Field label="Növ" htmlFor="a-type">
            <Select id="a-type" value={type} onChange={(e) => setType(e.target.value as ContentType)} options={TYPES.map((t) => ({ value: t, label: CONTENT_TYPE_LABEL[t] }))} />
          </Field>
          <Field label="Məzmun" htmlFor="a-content" required>
            <Select
              id="a-content"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder={content.isLoading ? 'Yüklənir…' : 'Seçin…'}
              options={(content.data ?? []).map((c) => ({ value: c.id, label: c.status && c.status !== 'PUBLISHED' ? `${c.title} (qaralama)` : c.title }))}
            />
          </Field>
        </div>
        <Field label="Son tarix" htmlFor="a-due" hint="Boş qalsa — müddətsiz">
          <Input id="a-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Qruplar">
          <div className="flex flex-wrap gap-2">
            {(groups.data ?? []).map((g) => {
              const on = groupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGroupIds((ids) => (on ? ids.filter((x) => x !== g.id) : [...ids, g.id]))}
                  className={cn('inline-flex h-9 items-center gap-2 rounded-xl border-2 px-3 text-sm font-semibold transition', on ? 'border-ink bg-elev shadow-stamp-sm' : 'border-line text-muted hover:border-ink/50')}
                >
                  <span className="size-2.5 rounded-full border border-ink" style={{ background: g.color ?? 'var(--signal)' }} />
                  {g.name}
                  {on && <Check className="size-3.5" />}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
