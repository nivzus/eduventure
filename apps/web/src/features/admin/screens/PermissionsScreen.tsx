'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Globe, KeyRound, Lock, Search, Users } from 'lucide-react';
import { Badge, Input, Popover, Segmented, Select, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { CONTENT_TYPE_LABEL, STATUS_LABEL, VISIBILITY_LABEL, type ContentStatus, type ContentType, type Visibility } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAllGroups, usePermissions, useSetVisibility } from '../hooks';
import type { PermissionRow } from '../types';
import { AdminPage, EmptyNote, Sheet, SheetSkeleton } from '../components/kit';

const VIS: Visibility[] = ['PUBLIC', 'PRIVATE', 'GROUPS', 'PASSCODE'];
const VIS_ICON: Record<Visibility, typeof Globe> = { PUBLIC: Globe, PRIVATE: Lock, GROUPS: Users, PASSCODE: KeyRound };
const TYPE_FILTERS: ('' | ContentType)[] = ['', 'QUIZ', 'ARTICLE', 'COURSE', 'PATH', 'DECK'];

export function PermissionsScreen() {
  const { data, isLoading } = usePermissions();
  const groups = useAllGroups();
  const setVis = useSetVisibility();
  const [type, setType] = useState<'' | ContentType>('');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    return (data ?? []).filter((r) => (!type || r.type === type) && (!needle || r.title.toLocaleLowerCase('az').includes(needle)));
  }, [data, type, q]);

  const counts = useMemo(() => {
    const c: Record<Visibility, number> = { PUBLIC: 0, PRIVATE: 0, GROUPS: 0, PASSCODE: 0 };
    (data ?? []).forEach((r) => c[r.visibility]++);
    return c;
  }, [data]);

  const apply = (r: PermissionRow, patch: { visibility?: Visibility; passcode?: string; groupIds?: string[] }) => {
    const visibility = patch.visibility ?? r.visibility;
    if (visibility === 'PASSCODE' && !(patch.passcode ?? r.passcode)) {
      // wait for a passcode before saving
      return false;
    }
    if (visibility === 'GROUPS' && !(patch.groupIds ?? r.groupIds).length) return false;
    setVis.mutate(
      {
        type: r.type,
        id: r.id,
        visibility,
        ...(visibility === 'PASSCODE' ? { passcode: patch.passcode ?? r.passcode ?? undefined } : {}),
        ...(visibility === 'GROUPS' ? { groupIds: patch.groupIds ?? r.groupIds } : {}),
      },
      {
        onSuccess: () => toast.success(`“${r.title}” → ${VISIBILITY_LABEL[visibility]}`),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
    return true;
  };

  return (
    <AdminPage roles={['ADMIN']} note="açarlar və qapılar" title="İcazələr" subtitle="kim nəyi görə bilər — bir cədvəldə">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VIS.map((v, i) => {
          const Icon = VIS_ICON[v];
          return (
            <div key={v} className={cn('rounded-2xl border-2 border-ink bg-elev p-3 shadow-stamp-sm', i % 2 ? 'rotate-[0.5deg]' : '-rotate-[0.4deg]')}>
              <div className="mono-label flex items-center gap-1.5">
                <Icon className="size-4" /> {VISIBILITY_LABEL[v]}
              </div>
              <div className="font-display text-2xl font-extrabold tabular">{data ? counts[v] : '—'}</div>
            </div>
          );
        })}
      </div>

      <Sheet bodyClassName="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlıq üzrə axtar…" leftIcon={<Search className="size-4" />} wrapperClassName="w-full lg:max-w-xs" aria-label="Məzmun axtar" />
          <div className="-mx-1 overflow-x-auto px-1">
            <Segmented<'' | ContentType>
              size="sm"
              aria-label="Məzmun növü"
              value={type}
              onChange={setType}
              tabs={TYPE_FILTERS.map((t) => ({ value: t, label: t ? CONTENT_TYPE_LABEL[t] : 'Hamısı' }))}
            />
          </div>
        </div>

        {isLoading ? (
          <SheetSkeleton rows={6} />
        ) : !rows.length ? (
          <EmptyNote message="Məzmun tapılmadı" />
        ) : (
          <Table wrapperClassName="rounded-2xl border-2 border-ink shadow-none" className="min-w-[880px]">
            <THead>
              <TR>
                <TH>Məzmun</TH>
                <TH>Müəllif</TH>
                <TH>Görünürlük</TH>
                <TH>Şifrə / Qruplar</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={`${r.type}-${r.id}`}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Badge size="sm" tone="signal" variant="outline">
                        {CONTENT_TYPE_LABEL[r.type] ?? r.type}
                      </Badge>
                      {r.status && r.status !== 'PUBLISHED' && (
                        <Badge size="sm" tone="neutral" variant="outline">
                          {STATUS_LABEL[r.status as ContentStatus] ?? r.status}
                        </Badge>
                      )}
                    </div>
                    {r.link ? (
                      <Link href={r.link} className="mt-1 block max-w-[300px] truncate font-semibold hover:underline">
                        {r.title}
                      </Link>
                    ) : (
                      <p className="mt-1 max-w-[300px] truncate font-semibold">{r.title}</p>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-sm text-muted">{r.author?.name ?? '—'}</TD>
                  <TD>
                    <VisibilitySelect row={r} onApply={apply} groups={groups.data ?? []} />
                  </TD>
                  <TD>
                    {r.visibility === 'PASSCODE' ? (
                      <PasscodeInput row={r} onSave={(passcode) => apply(r, { visibility: 'PASSCODE', passcode })} />
                    ) : r.visibility === 'GROUPS' ? (
                      <GroupPicker row={r} groups={groups.data ?? []} onChange={(groupIds) => apply(r, { visibility: 'GROUPS', groupIds })} />
                    ) : (
                      <span className="hand text-lg text-subtle">{r.visibility === 'PUBLIC' ? 'hamı görür' : 'yalnız müəllif'}</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Sheet>
    </AdminPage>
  );
}

type GroupLite = { id: string; name: string; color?: string | null };
type ApplyFn = (r: PermissionRow, p: { visibility?: Visibility; passcode?: string; groupIds?: string[] }) => boolean;

function VisibilitySelect({ row, onApply, groups }: { row: PermissionRow; onApply: ApplyFn; groups: GroupLite[] }) {
  // PASSCODE without a passcode / GROUPS without groups stay local until completed
  const [pending, setPending] = useState<Visibility | null>(null);
  useEffect(() => setPending(null), [row.visibility]);
  const value = pending ?? row.visibility;
  return (
    <div className="space-y-1.5">
      <Select
        selectSize="sm"
        aria-label={`${row.title} görünürlüyü`}
        value={value}
        wrapperClassName="w-40"
        onChange={(e) => {
          const v = e.target.value as Visibility;
          if (!onApply(row, { visibility: v })) setPending(v);
        }}
        options={VIS.map((v) => ({ value: v, label: VISIBILITY_LABEL[v] }))}
      />
      {pending === 'PASSCODE' && (
        <PasscodeInput
          row={row}
          autoFocus
          onSave={(passcode) => {
            onApply({ ...row, passcode }, { visibility: 'PASSCODE' });
          }}
        />
      )}
      {pending === 'GROUPS' && <GroupPicker row={{ ...row, groupIds: [] }} groups={groups} onChange={(groupIds) => onApply(row, { visibility: 'GROUPS', groupIds })} />}
    </div>
  );
}

function PasscodeInput({ row, onSave, autoFocus }: { row: PermissionRow; onSave: (passcode: string) => void; autoFocus?: boolean }) {
  const [v, setV] = useState(row.passcode ?? '');
  useEffect(() => setV(row.passcode ?? ''), [row.passcode]);
  const dirty = v.trim() !== (row.passcode ?? '');
  const save = () => {
    if (!dirty) return;
    if (v.trim().length < 3) return toast.error('Şifrə ən azı 3 simvol olmalıdır');
    onSave(v.trim());
  };
  return (
    <div className="flex w-48 items-center gap-1.5">
      <Input
        inputSize="sm"
        value={v}
        autoFocus={autoFocus}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        onBlur={save}
        placeholder="şifrə…"
        aria-label={`${row.title} şifrəsi`}
        className="font-mono"
        leftIcon={<KeyRound className="size-3.5" />}
      />
      {dirty && (
        <button type="button" onClick={save} className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-ink bg-signal text-signal-fg shadow-stamp-sm" aria-label="Şifrəni saxla">
          <Check className="size-4" />
        </button>
      )}
    </div>
  );
}

function GroupPicker({ row, groups, onChange }: { row: PermissionRow; groups: GroupLite[]; onChange: (ids: string[]) => void }) {
  const selected = new Set(row.groupIds);
  const names = groups.filter((g) => selected.has(g.id));
  return (
    <Popover
      align="start"
      trigger={
        <button type="button" className="inline-flex min-h-9 max-w-[260px] items-center gap-1.5 rounded-xl border-2 border-line px-2.5 py-1 text-left text-sm hover:border-ink">
          {names.length ? (
            <span className="flex flex-wrap gap-1">
              {names.map((g) => (
                <span key={g.id} className="inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 text-xs font-semibold">
                  <span className="size-2 rounded-full" style={{ background: g.color ?? 'var(--signal)' }} />
                  {g.name}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-danger">qrup seçin</span>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted" />
        </button>
      }
    >
      <div className="w-64 p-1.5">
        <p className="mono-label px-2 pb-1">Qruplar</p>
        {!groups.length && <p className="px-2 py-3 text-sm text-subtle">Qrup yoxdur</p>}
        {groups.map((g) => {
          const on = selected.has(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = on ? row.groupIds.filter((x) => x !== g.id) : [...row.groupIds, g.id];
                if (!next.length) return toast.error('Ən azı bir qrup qalmalıdır');
                onChange(next);
              }}
              className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-fg/[0.05]', on && 'font-semibold')}
            >
              <span className={cn('grid size-5 place-items-center rounded-md border-2 border-ink', on ? 'bg-signal text-signal-fg' : 'bg-elev')}>{on && <Check className="size-3" />}</span>
              <span className="size-2.5 rounded-full" style={{ background: g.color ?? 'var(--signal)' }} />
              <span className="truncate">{g.name}</span>
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
