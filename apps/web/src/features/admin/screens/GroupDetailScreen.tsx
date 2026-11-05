'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, ClipboardPlus, Pencil, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import { Avatar, Badge, Button, IconButton, Table, TBody, TD, TH, THead, TR } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/features/community/components/shared/ConfirmModal';
import type { Assignment } from '@/features/community/types';
import { errorMessage } from '@/lib/api';
import { CONTENT_TYPE_LABEL } from '@/lib/types';
import { formatDate, formatNumber, formatRelative } from '@/lib/utils';
import { useAdminGroup, useDeleteAssignment, useDeleteGroup, useGroupAssignments, useGroupStats, useRemoveMember } from '../hooks';
import { AssignModal, GroupFormModal, MemberPickerModal } from '../components/groupModals';
import { AdminPage, DerivedTag, EmptyNote, Kpi, PctBar, Sheet, SheetSkeleton } from '../components/kit';
import { HBarList } from '../components/charts';

type AssignmentRow = Assignment & { doneCount?: number; completedCount?: number; total?: number };

export function GroupDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { data: g, isLoading, error } = useAdminGroup(id);
  const memberIds = useMemo(() => g?.members?.map((m) => m.userId ?? m.user.id), [g]);
  const stats = useGroupStats(id, memberIds);
  const assignmentsQ = useGroupAssignments(id);
  const remove = useRemoveMember(id);
  const delGroup = useDeleteGroup();
  const delAssignment = useDeleteAssignment(id);

  const [edit, setEdit] = useState(false);
  const [pick, setPick] = useState(false);
  const [assign, setAssign] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);

  const perf = useMemo(() => new Map((stats.data?.byUser ?? []).map((u) => [u.userId, u])), [stats.data]);
  const members = g?.members ?? [];
  const assignments = (assignmentsQ.data?.length ? assignmentsQ.data : (g?.assignments ?? [])) as AssignmentRow[];

  if (error && !g) {
    return (
      <AdminPage back={{ href: '/admin/groups', label: 'Qruplar' }} title="Qrup tapılmadı">
        <Sheet>
          <EmptyNote mode="sad" message="Bu qrup yoxdur" hint={errorMessage(error)} />
        </Sheet>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      back={{ href: '/admin/groups', label: 'Qruplar' }}
      note={g?.teacher ? `müəllim: ${g.teacher.name}` : 'qrup'}
      title={
        <span className="inline-flex items-center gap-3">
          {g && <span aria-hidden className="inline-block size-5 shrink-0 rounded-md border-2 border-ink" style={{ background: g.color ?? 'var(--signal)' }} />}
          {g?.name ?? 'Yüklənir…'}
        </span>
      }
      subtitle={g?.description ?? undefined}
      actions={
        <>
          <DerivedTag show={stats.data?.derived} />
          <Button size="sm" leftIcon={<ClipboardPlus />} onClick={() => setAssign(true)} disabled={!g}>
            Tapşırıq ver
          </Button>
          <Button size="sm" variant="secondary" leftIcon={<Pencil />} onClick={() => setEdit(true)} disabled={!g}>
            Redaktə
          </Button>
          <IconButton label="Qrupu sil" icon={<Trash2 />} className="hover:text-danger" onClick={() => setConfirmDel(true)} disabled={!g} />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi index={0} label="Üzvlər" value={g ? members.length : null} />
        <Kpi index={1} label="Cəhdlər" value={stats.data?.attempts} />
        <Kpi index={2} tone="signal" label="Orta nəticə" value={stats.data?.avgPercent == null ? null : Math.round(stats.data.avgPercent)} suffix="%" />
        <Kpi
          index={3}
          label={stats.data?.completionRate != null ? 'Tapşırıq icrası' : 'Keçid faizi'}
          value={
            stats.data?.completionRate != null
              ? Math.round(stats.data.completionRate * 100)
              : stats.data?.passRate == null
                ? null
                : Math.round(stats.data.passRate * 100)
          }
          suffix="%"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Sheet
          title="Üzvlər"
          note="nəticələri ilə birlikdə"
          actions={
            <Button size="sm" variant="secondary" leftIcon={<UserPlus />} onClick={() => setPick(true)} disabled={!g}>
              Üzv əlavə et
            </Button>
          }
        >
          {isLoading ? (
            <SheetSkeleton rows={5} />
          ) : !members.length ? (
            <EmptyNote message="Qrup boşdur" hint="“Üzv əlavə et” ilə tələbələri seçin." />
          ) : (
            <Table wrapperClassName="rounded-2xl border-2 border-ink shadow-none" className="min-w-[560px]">
              <THead>
                <TR>
                  <TH>Tələbə</TH>
                  <TH className="text-right">XP</TH>
                  <TH className="text-right">Cəhd</TH>
                  <TH>Orta</TH>
                  <TH className="w-10">
                    <span className="sr-only">Çıxar</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {members.map((m) => {
                  const p = perf.get(m.user.id);
                  return (
                    <TR key={m.user.id}>
                      <TD>
                        <Link href={`/u/${m.user.id}`} className="flex items-center gap-3 hover:underline">
                          <Avatar name={m.user.name} src={m.user.avatarUrl} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{m.user.name}</span>
                            {m.joinedAt && <span className="block text-xs text-subtle">qoşulub {formatRelative(m.joinedAt)}</span>}
                          </span>
                        </Link>
                      </TD>
                      <TD className="text-right font-mono tabular">{m.user.xp != null ? formatNumber(m.user.xp) : '—'}</TD>
                      <TD className="text-right font-mono tabular">{p?.attempts ?? 0}</TD>
                      <TD>
                        <PctBar value={p?.avgPercent} />
                      </TD>
                      <TD>
                        <IconButton size="sm" label={`${m.user.name} qrupdan çıxar`} icon={<UserMinus />} className="hover:text-danger" onClick={() => setToRemove({ id: m.user.id, name: m.user.name })} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Sheet>

        <div className="space-y-6">
          <Sheet title="Liderlər" note="orta nəticəyə görə">
            {stats.isLoading ? (
              <SheetSkeleton rows={3} />
            ) : (
              <HBarList
                inked
                max={100}
                emptyLabel="Hələ nəticə yoxdur"
                data={[...(stats.data?.byUser ?? [])]
                  .sort((a, b) => (b.avgPercent ?? 0) - (a.avgPercent ?? 0))
                  .slice(0, 5)
                  .map((u) => ({ key: u.userId, label: u.name, value: u.avgPercent ?? 0, display: `${Math.round(u.avgPercent ?? 0)}% · ${u.attempts} cəhd` }))}
              />
            )}
          </Sheet>

          <Sheet title="Tapşırıqlar" note={`${assignments.length} aktiv`}>
            {assignmentsQ.isLoading && !assignments.length ? (
              <SheetSkeleton rows={3} />
            ) : !assignments.length ? (
              <EmptyNote message="Tapşırıq yoxdur" hint={<Button size="sm" className="mt-1" leftIcon={<ClipboardPlus />} onClick={() => setAssign(true)}>Tapşırıq ver</Button>} />
            ) : (
              <ul className="space-y-2.5">
                {assignments.map((a) => {
                  const overdue = a.dueAt && new Date(a.dueAt) < new Date();
                  const done = a.doneCount ?? a.completedCount;
                  return (
                    <li key={a.id} className="flex items-start gap-3 rounded-2xl border-2 border-line bg-bg/40 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Badge size="sm" tone="signal" variant="outline">
                          {CONTENT_TYPE_LABEL[a.contentType] ?? a.contentType}
                        </Badge>
                        <p className="mt-1 truncate font-semibold">{a.title ?? a.content?.title ?? 'Məzmun'}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                          {a.dueAt ? (
                            <span className={overdue ? 'text-danger' : undefined}>
                              <CalendarClock className="mr-1 inline size-3.5" />
                              {formatDate(a.dueAt)}
                            </span>
                          ) : (
                            <span>müddətsiz</span>
                          )}
                          {done != null && <span>{done}/{a.total ?? members.length} tamamlayıb</span>}
                        </p>
                      </div>
                      <IconButton
                        size="sm"
                        label="Tapşırığı sil"
                        icon={<X />}
                        className="hover:text-danger"
                        onClick={() => delAssignment.mutate(a.id, { onSuccess: () => toast.success('Tapşırıq silindi'), onError: (e) => toast.error(errorMessage(e)) })}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Sheet>
        </div>
      </div>

      {!!(stats.data?.quizzes.length || stats.data?.weakTopics.length) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Sheet title="Testlər üzrə" note="qrupun orta nəticəsi">
            <HBarList
              inked
              max={100}
              emptyLabel="Hələ nəticə yoxdur"
              data={(stats.data?.quizzes ?? []).map((q) => ({
                key: q.id,
                label: (
                  <Link href={`/admin/analytics/quizzes/${q.id}`} className="font-semibold hover:underline">
                    {q.title}
                  </Link>
                ),
                value: q.avgPercent ?? 0,
                display: `${Math.round(q.avgPercent ?? 0)}% · ${q.attempts} cəhd`,
              }))}
            />
          </Sheet>
          <Sheet title="Zəif mövzular" note="ən az düzgün cavablanan teqlər">
            <HBarList
              inked
              max={1}
              emptyLabel="Mövzu məlumatı yoxdur"
              data={[...(stats.data?.weakTopics ?? [])]
                .sort((a, b) => a.accuracy - b.accuracy)
                .slice(0, 6)
                .map((t) => ({
                  key: t.tag,
                  label: <span className="font-mono text-sm">#{t.tag}</span>,
                  value: t.accuracy,
                  color: t.accuracy < 0.5 ? 'var(--ember)' : 'var(--signal)',
                  display: `${Math.round(t.accuracy * 100)}% · ${t.total} cavab`,
                }))}
            />
          </Sheet>
        </div>
      )}

      {g && (
        <>
          <GroupFormModal open={edit} onClose={() => setEdit(false)} group={g} />
          <MemberPickerModal open={pick} onClose={() => setPick(false)} groupId={id} existing={memberIds ?? []} />
          <AssignModal open={assign} onClose={() => setAssign(false)} groupId={id} />
        </>
      )}
      <ConfirmModal
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        title={`${toRemove?.name ?? ''} qrupdan çıxarılsın?`}
        confirmLabel="Çıxar"
        loading={remove.isPending}
        onConfirm={() =>
          toRemove &&
          remove.mutate(toRemove.id, {
            onSuccess: () => {
              toast.success('Üzv çıxarıldı');
              setToRemove(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
      <ConfirmModal
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Qrup silinsin?"
        description="Üzvlük və qrup tapşırıqları silinəcək. Bu əməliyyatı geri qaytarmaq olmaz."
        confirmLabel="Sil"
        loading={delGroup.isPending}
        onConfirm={() =>
          delGroup.mutate(id, {
            onSuccess: () => {
              toast.success('Qrup silindi');
              router.push('/admin/groups');
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </AdminPage>
  );
}
