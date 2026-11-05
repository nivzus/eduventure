'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button, IconButton, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Tape } from '@/components/notebook';
import { ConfirmModal } from '@/features/community/components/shared/ConfirmModal';
import type { Group } from '@/features/community/types';
import { errorMessage } from '@/lib/api';
import { useAllGroups, useDeleteGroup } from '../hooks';
import { GroupFormModal } from '../components/groupModals';
import { AdminPage, EmptyNote, Sheet } from '../components/kit';

type GroupRow = Group & { assignmentCount?: number };

const count = (g: GroupRow) => ({
  members: g.memberCount ?? g._count?.members ?? g.members?.length ?? 0,
  assignments: g.assignmentCount ?? g._count?.assignments ?? g.assignments?.length ?? 0,
});

export function GroupsScreen() {
  const { data, isLoading } = useAllGroups();
  const del = useDeleteGroup();
  const [form, setForm] = useState<{ open: boolean; group: Group | null }>({ open: false, group: null });
  const [toDelete, setToDelete] = useState<Group | null>(null);
  const list = (data ?? []) as GroupRow[];

  return (
    <AdminPage
      note="sinif otaqları"
      title="Qruplar"
      subtitle={data ? `${list.length} qrup` : undefined}
      actions={
        <Button leftIcon={<Plus />} onClick={() => setForm({ open: true, group: null })}>
          Yeni qrup
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : !list.length ? (
        <Sheet>
          <EmptyNote
            message="Hələ qrup yoxdur"
            hint={
              <Button className="mt-2" size="sm" leftIcon={<Plus />} onClick={() => setForm({ open: true, group: null })}>
                İlk qrupu yarat
              </Button>
            }
          />
        </Sheet>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g, i) => {
            const c = count(g);
            return (
              <motion.li
                key={g.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className="relative rounded-3xl border-2 border-ink bg-elev shadow-stamp"
              >
                <Tape className="-top-3 left-6" rotate={i % 2 ? 5 : -6} />
                <div className="h-3 rounded-t-[22px] border-b-2 border-ink" style={{ background: g.color ?? 'var(--signal)' }} />
                <div className="p-5">
                  <Link href={`/admin/groups/${g.id}`} className="block font-display text-xl font-bold leading-tight hover:underline">
                    {g.name}
                  </Link>
                  {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
                  {g.teacher && <p className="hand mt-2 text-lg text-subtle">müəllim: {g.teacher.name}</p>}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex gap-4 font-mono text-sm tabular">
                      <span className="inline-flex items-center gap-1.5" title="Üzvlər">
                        <Users className="size-4 text-muted" /> {c.members}
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Tapşırıqlar">
                        <ClipboardList className="size-4 text-muted" /> {c.assignments}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <IconButton size="sm" label="Redaktə et" icon={<Pencil />} onClick={() => setForm({ open: true, group: g })} />
                      <IconButton size="sm" label="Sil" icon={<Trash2 />} className="hover:text-danger" onClick={() => setToDelete(g)} />
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <GroupFormModal open={form.open} group={form.group} onClose={() => setForm((f) => ({ ...f, open: false }))} />
      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`“${toDelete?.name ?? ''}” silinsin?`}
        description="Qrup, üzvlük və qrupa verilmiş tapşırıqlar silinəcək. Tələbələrin nəticələri qalır."
        confirmLabel="Sil"
        loading={del.isPending}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Qrup silindi');
              setToDelete(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </AdminPage>
  );
}
