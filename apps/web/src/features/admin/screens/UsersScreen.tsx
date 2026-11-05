'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Download, Search, Trash2 } from 'lucide-react';
import { Avatar, Button, IconButton, Input, Segmented, Select, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/features/community/components/shared/ConfirmModal';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce } from '@/lib/hooks';
import { ROLE_LABEL, ROLES, type Role } from '@/lib/types';
import { cn, formatNumber, formatRelative } from '@/lib/utils';
import { useChangeRole, useDeleteUser, useUsers } from '../hooks';
import { downloadCsv, stamp } from '../lib/csv';
import type { AdminUser } from '../types';
import { AdminPage, EmptyNote, Sheet, SheetSkeleton } from '../components/kit';

type RoleFilter = '' | Role;

export function UsersScreen() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleFilter>('');
  const dq = useDebounce(q.trim(), 300);
  const { data, isLoading, isFetching } = useUsers(dq, role);
  const changeRole = useChangeRole();
  const del = useDeleteUser();
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const list = data ?? [];

  const onRole = (u: AdminUser, next: Role) => {
    if (next === u.role) return;
    changeRole.mutate(
      { id: u.id, role: next },
      {
        onSuccess: () => toast.success(`${u.name} → ${ROLE_LABEL[next]}`),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  const exportCsv = () =>
    downloadCsv(
      `istifadeciler-${stamp()}`,
      ['Ad', 'E-poçt', 'Rol', 'XP', 'Səviyyə', 'Cəhdlər', 'Son aktivlik', 'Qeydiyyat'],
      list.map((u) => [u.name, u.email, ROLE_LABEL[u.role], u.xp, u.level, u.attemptsCount ?? '', u.lastActiveAt ?? '', u.createdAt ?? '']),
    );

  return (
    <AdminPage
      roles={['ADMIN']}
      note="səyahətçilər siyahısı"
      title="İstifadəçilər"
      subtitle={data ? `${list.length} nəfər tapıldı` : 'yüklənir…'}
      actions={
        <Button variant="secondary" size="sm" leftIcon={<Download />} onClick={exportCsv} disabled={!list.length}>
          CSV
        </Button>
      }
    >
      <Sheet bodyClassName="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ad və ya e-poçt ilə axtar…"
            leftIcon={<Search className="size-4" />}
            wrapperClassName="sm:max-w-sm w-full"
            aria-label="İstifadəçi axtar"
          />
          <div className="-mx-1 overflow-x-auto px-1">
            <Segmented<RoleFilter>
              size="sm"
              aria-label="Rol filtri"
              value={role}
              onChange={setRole}
              tabs={[{ value: '', label: 'Hamısı' }, ...ROLES.map((r) => ({ value: r as RoleFilter, label: ROLE_LABEL[r] }))]}
            />
          </div>
        </div>

        {isLoading ? (
          <SheetSkeleton rows={6} />
        ) : !list.length ? (
          <EmptyNote message="Heç kim tapılmadı" hint="Axtarışı və ya rol filtrini dəyişin." />
        ) : (
          <Table wrapperClassName={cn('rounded-2xl border-2 border-ink shadow-none transition-opacity', isFetching && 'opacity-70')} className="min-w-[760px]">
            <THead>
              <TR>
                <TH>İstifadəçi</TH>
                <TH>Rol</TH>
                <TH className="text-right">XP</TH>
                <TH className="text-right">Cəhd</TH>
                <TH>Son aktivlik</TH>
                <TH className="w-12">
                  <span className="sr-only">Əməliyyatlar</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {list.map((u) => {
                const self = u.id === me?.id;
                return (
                  <TR key={u.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <Link href={`/u/${u.id}`} className="block truncate font-semibold hover:underline">
                            {u.name}
                            {self && <span className="hand ml-1.5 text-base text-signal">(siz)</span>}
                          </Link>
                          <span className="block truncate text-xs text-muted">{u.email}</span>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Select
                        selectSize="sm"
                        aria-label={`${u.name} rolu`}
                        value={u.role}
                        disabled={self || (changeRole.isPending && changeRole.variables?.id === u.id)}
                        onChange={(e) => onRole(u, e.target.value as Role)}
                        options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                        wrapperClassName="w-32"
                      />
                    </TD>
                    <TD className="text-right font-mono tabular">
                      {formatNumber(u.xp)}
                      <span className="ml-1 text-xs text-subtle">· {u.level} səv.</span>
                    </TD>
                    <TD className="text-right font-mono tabular">{u.attemptsCount ?? '—'}</TD>
                    <TD className="whitespace-nowrap text-sm text-muted">{u.lastActiveAt ? formatRelative(u.lastActiveAt) : '—'}</TD>
                    <TD>
                      <IconButton label={`${u.name} sil`} icon={<Trash2 />} size="sm" disabled={self} onClick={() => setToDelete(u)} className="hover:text-danger" />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Sheet>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`${toDelete?.name ?? ''} silinsin?`}
        description="İstifadəçinin bütün cəhdləri, qeydləri və irəliləyişi silinəcək. Bu əməliyyatı geri qaytarmaq olmaz."
        confirmLabel="Sil"
        loading={del.isPending}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('İstifadəçi silindi');
              setToDelete(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </AdminPage>
  );
}
