'use client';

import { useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button, Input, Segmented, Skeleton } from '@/components/ui';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ContentStatus } from '../types';
import { StatusBadge } from './ui';

export interface PickOption {
  type: string;
  id: string;
  title: string;
  sub?: string;
  status?: ContentStatus;
}

export interface PickGroup {
  value: string;
  label: string;
  options: PickOption[];
  loading?: boolean;
}

/** Merge several lists by id (e.g. "mine" + public), keeping the first occurrence. */
export function mergeById<T extends { id: string }>(...lists: (T[] | undefined)[]): T[] {
  const seen = new Map<string, T>();
  for (const l of lists) for (const x of l ?? []) if (!seen.has(x.id)) seen.set(x.id, x);
  return [...seen.values()];
}

/** Multi-select picker modal with optional type tabs + search. */
export function PickerModal({
  open,
  onClose,
  title,
  description,
  groups,
  existing,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  groups: PickGroup[];
  /** keys `${type}:${id}` already in the list */
  existing: Set<string>;
  onAdd: (picked: PickOption[]) => void;
}) {
  const [tab, setTab] = useState(groups[0]?.value ?? '');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<PickOption[]>([]);
  useEffect(() => {
    if (open) {
      setPicked([]);
      setQ('');
    }
  }, [open]);

  const group = groups.find((g) => g.value === tab) ?? groups[0];
  const term = q.trim().toLocaleLowerCase('az');
  const list = (group?.options ?? []).filter((o) => !term || o.title.toLocaleLowerCase('az').includes(term) || (o.sub ?? '').toLocaleLowerCase('az').includes(term));
  const keyOf = (o: PickOption) => `${o.type}:${o.id}`;
  const isPicked = (o: PickOption) => picked.some((p) => keyOf(p) === keyOf(o));
  const toggle = (o: PickOption) => setPicked((p) => (isPicked(o) ? p.filter((x) => keyOf(x) !== keyOf(o)) : [...p, o]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Ləğv et</Button>
          <Button
            disabled={!picked.length}
            onClick={() => {
              onAdd(picked);
              onClose();
            }}
          >
            Əlavə et{picked.length ? ` (${picked.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {groups.length > 1 && (
          <Segmented
            fill
            size="sm"
            value={tab}
            onChange={setTab}
            tabs={groups.map((g) => ({ value: g.value, label: g.label, count: g.options.length }))}
          />
        )}
        <Input inputSize="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Axtar…" leftIcon={<Search className="size-4" />} aria-label="Axtar" autoFocus />
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
          {group?.loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
          ) : !list.length ? (
            <li className="hand py-6 text-center text-xl text-muted">Heç nə tapılmadı</li>
          ) : (
            list.map((o) => {
              const already = existing.has(keyOf(o));
              const on = isPicked(o);
              return (
                <li key={keyOf(o)}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => toggle(o)}
                    aria-pressed={on}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition',
                      on ? 'border-ink bg-signal/10 shadow-stamp-sm' : 'border-transparent hover:bg-fg/[0.05]',
                      already && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded-md border-2', on || already ? 'border-ink bg-signal text-signal-fg' : 'border-line-strong')}>
                      {(on || already) && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{o.title}</span>
                      {(o.sub || already) && <span className="block truncate text-xs text-muted">{already ? 'artıq əlavə olunub' : o.sub}</span>}
                    </span>
                    {o.status && o.status !== 'PUBLISHED' && <StatusBadge status={o.status} />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </Modal>
  );
}
