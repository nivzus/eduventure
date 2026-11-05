'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Button, Field, IconButton, Input, Modal, Segmented, Select, Switch, Table, TBody, TD, TH, THead, TR, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { ConfirmModal } from '@/features/community/components/shared/ConfirmModal';
import { ACHIEVEMENT_ICON_NAMES, achievementIcon } from '@/features/community/lib/icons';
import { errorMessage } from '@/lib/api';
import type { QuestPeriod, QuestType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAdminAchievements, useAdminQuests, useDeleteAchievement, useDeleteQuest, useSaveAchievement, useSaveQuest } from '../hooks';
import type { AdminAchievement, AdminQuest } from '../types';
import { AdminPage, EmptyNote, Sheet, SheetSkeleton } from '../components/kit';

const QUEST_TYPE_LABEL: Record<QuestType, string> = {
  COMPLETE_QUIZZES: 'Test tamamla',
  READ_ARTICLES: 'Məqalə oxu',
  STUDY_CARDS: 'Kart təkrarla',
  PERFECT_SCORE: '100% topla',
  EARN_XP: 'XP qazan',
};
const PERIOD_LABEL: Record<QuestPeriod, string> = { DAILY: 'Gündəlik', WEEKLY: 'Həftəlik', ONCE: 'Birdəfəlik' };
const RULE_LABEL: Record<string, string> = {
  quizzes: 'Tamamlanmış testlər',
  passed: 'Keçilmiş testlər',
  perfect: '100% nəticələr',
  practice: 'Məşq sessiyaları',
  streak: 'Seriya (gün)',
  xp: 'Ümumi XP',
  level: 'Səviyyə',
  articles: 'Oxunmuş məqalələr',
  courses: 'Bitmiş kurslar',
  cards: 'Təkrarlanmış kartlar',
};

type Tab = 'quests' | 'achievements';

export function QuestsScreen({ initialTab = 'quests' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [questForm, setQuestForm] = useState<{ open: boolean; item: AdminQuest | null }>({ open: false, item: null });
  const [achForm, setAchForm] = useState<{ open: boolean; item: AdminAchievement | null }>({ open: false, item: null });

  return (
    <AdminPage
      roles={['ADMIN']}
      note="macəra tapşırıqları"
      title="Kvestlər və nailiyyətlər"
      subtitle="tələbələri hər gün geri qaytaran kiçik hədəflər"
      actions={
        <Button leftIcon={<Plus />} onClick={() => (tab === 'quests' ? setQuestForm({ open: true, item: null }) : setAchForm({ open: true, item: null }))}>
          {tab === 'quests' ? 'Yeni kvest' : 'Yeni nailiyyət'}
        </Button>
      }
    >
      <Segmented<Tab>
        aria-label="Bölmə"
        value={tab}
        onChange={setTab}
        className="mb-5"
        tabs={[
          { value: 'quests', label: 'Kvestlər' },
          { value: 'achievements', label: 'Nailiyyətlər' },
        ]}
      />
      {tab === 'quests' ? <QuestsTable onEdit={(item) => setQuestForm({ open: true, item })} /> : <AchievementsGrid onEdit={(item) => setAchForm({ open: true, item })} />}
      <QuestModal open={questForm.open} item={questForm.item} onClose={() => setQuestForm((f) => ({ ...f, open: false }))} />
      <AchievementModal open={achForm.open} item={achForm.item} onClose={() => setAchForm((f) => ({ ...f, open: false }))} />
    </AdminPage>
  );
}

/* ─────────── quests ─────────── */

function QuestsTable({ onEdit }: { onEdit: (q: AdminQuest) => void }) {
  const { data, isLoading } = useAdminQuests();
  const save = useSaveQuest();
  const del = useDeleteQuest();
  const [toDelete, setToDelete] = useState<AdminQuest | null>(null);
  const list = data ?? [];

  return (
    <Sheet>
      {isLoading ? (
        <SheetSkeleton rows={5} />
      ) : !list.length ? (
        <EmptyNote message="Kvest yoxdur" />
      ) : (
        <Table wrapperClassName="rounded-2xl border-2 border-ink shadow-none" className="min-w-[700px]">
          <THead>
            <TR>
              <TH>Kvest</TH>
              <TH>Növ</TH>
              <TH>Dövr</TH>
              <TH className="text-right">Hədəf</TH>
              <TH className="text-right">XP</TH>
              <TH>Aktiv</TH>
              <TH className="w-20">
                <span className="sr-only">Əməliyyatlar</span>
              </TH>
            </TR>
          </THead>
          <TBody>
            {list.map((q) => (
              <TR key={q.id} className={cn(!q.active && 'opacity-60')}>
                <TD>
                  <p className="font-semibold">{q.title}</p>
                  {q.description && <p className="max-w-[260px] truncate text-xs text-muted">{q.description}</p>}
                </TD>
                <TD className="whitespace-nowrap text-sm">{QUEST_TYPE_LABEL[q.type] ?? q.type}</TD>
                <TD>
                  <Badge size="sm" tone={q.period === 'DAILY' ? 'signal' : q.period === 'WEEKLY' ? 'aurora' : 'neutral'} variant="outline">
                    {PERIOD_LABEL[q.period] ?? q.period}
                  </Badge>
                </TD>
                <TD className="text-right font-mono tabular">{q.target}</TD>
                <TD className="text-right font-mono tabular">+{q.xpReward}</TD>
                <TD>
                  <Switch
                    size="sm"
                    checked={q.active}
                    label={<span className="sr-only">{q.title} aktivdir</span>}
                    onCheckedChange={(active) => save.mutate({ id: q.id, active }, { onError: (e) => toast.error(errorMessage(e)) })}
                  />
                </TD>
                <TD>
                  <div className="flex gap-1">
                    <IconButton size="sm" label="Redaktə et" icon={<Pencil />} onClick={() => onEdit(q)} />
                    <IconButton size="sm" label="Sil" icon={<Trash2 />} className="hover:text-danger" onClick={() => setToDelete(q)} />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`“${toDelete?.title ?? ''}” silinsin?`}
        description="Tələbələrin bu kvestdəki irəliləyişi də silinəcək."
        confirmLabel="Sil"
        loading={del.isPending}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Kvest silindi');
              setToDelete(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </Sheet>
  );
}

function QuestModal({ open, item, onClose }: { open: boolean; item: AdminQuest | null; onClose: () => void }) {
  const save = useSaveQuest();
  const [f, setF] = useState({ title: '', description: '', type: 'COMPLETE_QUIZZES' as QuestType, target: 1, xpReward: 20, period: 'DAILY' as QuestPeriod, active: true });
  useEffect(() => {
    if (open)
      setF({
        title: item?.title ?? '',
        description: item?.description ?? '',
        type: item?.type ?? 'COMPLETE_QUIZZES',
        target: item?.target ?? 1,
        xpReward: item?.xpReward ?? 20,
        period: item?.period ?? 'DAILY',
        active: item?.active ?? true,
      });
  }, [open, item]);

  const submit = () => {
    if (f.title.trim().length < 2) return toast.error('Başlıq yazın');
    if (!(f.target >= 1)) return toast.error('Hədəf ən azı 1 olmalıdır');
    save.mutate(
      { id: item?.id, ...f, title: f.title.trim(), description: f.description.trim() || null },
      {
        onSuccess: () => {
          toast.success(item ? 'Kvest yeniləndi' : 'Kvest yaradıldı');
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
      title={item ? 'Kvesti redaktə et' : 'Yeni kvest'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Ləğv et
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            Yadda saxla
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Başlıq" htmlFor="q-title" required>
          <Input id="q-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="məs. Gündə 1 test" />
        </Field>
        <Field label="Təsvir" htmlFor="q-desc">
          <Textarea id="q-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Növ" htmlFor="q-type">
            <Select id="q-type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as QuestType })} options={Object.entries(QUEST_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label="Dövr" htmlFor="q-period">
            <Select id="q-period" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value as QuestPeriod })} options={Object.entries(PERIOD_LABEL).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label="Hədəf" htmlFor="q-target" hint="neçə dəfə / neçə XP">
            <Input id="q-target" type="number" min={1} value={f.target} onChange={(e) => setF({ ...f, target: Number(e.target.value) })} />
          </Field>
          <Field label="Mükafat (XP)" htmlFor="q-xp">
            <Input id="q-xp" type="number" min={0} value={f.xpReward} onChange={(e) => setF({ ...f, xpReward: Number(e.target.value) })} />
          </Field>
        </div>
        <Switch checked={f.active} onCheckedChange={(active) => setF({ ...f, active })} label="Aktiv" description="Deaktiv kvestlər tələbələrə göstərilmir" />
      </div>
    </Modal>
  );
}

/* ─────────── achievements ─────────── */

function ruleText(rule: unknown): string {
  if (!rule || typeof rule !== 'object') return '—';
  const r = rule as Record<string, unknown>;
  const n = r.count ?? r.days ?? r.amount ?? r.level;
  return `${RULE_LABEL[String(r.type)] ?? String(r.type)} ≥ ${n ?? '?'}`;
}

function AchievementsGrid({ onEdit }: { onEdit: (a: AdminAchievement) => void }) {
  const { data, isLoading } = useAdminAchievements();
  const del = useDeleteAchievement();
  const [toDelete, setToDelete] = useState<AdminAchievement | null>(null);
  const list = data ?? [];

  if (isLoading) return <SheetSkeleton rows={4} />;
  if (!list.length)
    return (
      <Sheet>
        <EmptyNote message="Nailiyyət yoxdur" />
      </Sheet>
    );
  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a, i) => {
          const Icon = achievementIcon(a.icon);
          const unlocked = a.unlockedCount ?? a._count?.users ?? 0;
          return (
            <li key={a.id} className={cn('relative rounded-3xl border-2 border-ink bg-elev p-5 shadow-stamp', i % 2 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]')}>
              <div className="flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-ink bg-signal text-signal-fg shadow-stamp-sm">
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold leading-tight">{a.title}</p>
                  <p className="text-sm text-muted">{a.description}</p>
                  <p className="mt-1 font-mono text-[11px] text-subtle">{a.code}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge size="sm" tone="aurora" icon={<Sparkles className="size-3" />}>
                    +{a.xpReward} XP
                  </Badge>
                  <Badge size="sm" tone="neutral" variant="outline">
                    {ruleText(a.rule)}
                  </Badge>
                </div>
                <span className="hand text-lg text-subtle">{unlocked} nəfər açıb</span>
              </div>
              <div className="absolute right-3 top-3 flex gap-0.5">
                <IconButton size="sm" label="Redaktə et" icon={<Pencil />} onClick={() => onEdit(a)} />
                <IconButton size="sm" label="Sil" icon={<Trash2 />} className="hover:text-danger" onClick={() => setToDelete(a)} />
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`“${toDelete?.title ?? ''}” silinsin?`}
        description="Bu nailiyyəti açmış tələbələrdən də götürüləcək."
        confirmLabel="Sil"
        loading={del.isPending}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success('Nailiyyət silindi');
              setToDelete(null);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />
    </>
  );
}

function AchievementModal({ open, item, onClose }: { open: boolean; item: AdminAchievement | null; onClose: () => void }) {
  const save = useSaveAchievement();
  const [f, setF] = useState({ code: '', title: '', description: '', icon: 'Trophy', xpReward: 20, ruleType: 'quizzes', ruleN: 1 });
  useEffect(() => {
    if (!open) return;
    const r = (item?.rule ?? {}) as Record<string, unknown>;
    setF({
      code: item?.code ?? '',
      title: item?.title ?? '',
      description: item?.description ?? '',
      icon: item?.icon ?? 'Trophy',
      xpReward: item?.xpReward ?? 20,
      ruleType: String(r.type ?? 'quizzes'),
      ruleN: Number(r.count ?? r.days ?? r.amount ?? r.level ?? 1),
    });
  }, [open, item]);

  const submit = () => {
    if (f.title.trim().length < 2) return toast.error('Başlıq yazın');
    const code = f.code.trim() || f.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `ach-${Date.now()}`;
    const key = f.ruleType === 'streak' ? 'days' : f.ruleType === 'level' ? 'level' : 'count';
    save.mutate(
      { id: item?.id, code, title: f.title.trim(), description: f.description.trim(), icon: f.icon, xpReward: f.xpReward, rule: { type: f.ruleType, [key]: f.ruleN } },
      {
        onSuccess: () => {
          toast.success(item ? 'Nailiyyət yeniləndi' : 'Nailiyyət yaradıldı');
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
      title={item ? 'Nailiyyəti redaktə et' : 'Yeni nailiyyət'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Ləğv et
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            Yadda saxla
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlıq" htmlFor="a-title" required>
            <Input id="a-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="məs. Yorulmaz səyyah" />
          </Field>
          <Field label="Kod" htmlFor="a-code" hint="unikal, latın hərfləri">
            <Input id="a-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="quiz-10" className="font-mono" />
          </Field>
        </div>
        <Field label="Təsvir" htmlFor="a-desc">
          <Textarea id="a-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Şərt" htmlFor="a-rule">
            <Select id="a-rule" value={f.ruleType} onChange={(e) => setF({ ...f, ruleType: e.target.value })} options={Object.entries(RULE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label="Hədd" htmlFor="a-n">
            <Input id="a-n" type="number" min={1} value={f.ruleN} onChange={(e) => setF({ ...f, ruleN: Number(e.target.value) })} />
          </Field>
          <Field label="XP" htmlFor="a-xp">
            <Input id="a-xp" type="number" min={0} value={f.xpReward} onChange={(e) => setF({ ...f, xpReward: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="İkon">
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border-2 border-dashed border-line-strong p-2" role="radiogroup" aria-label="İkon">
            {ACHIEVEMENT_ICON_NAMES.map((name) => {
              const I = achievementIcon(name);
              const on = f.icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={name}
                  title={name}
                  onClick={() => setF({ ...f, icon: name })}
                  className={cn('grid size-10 place-items-center rounded-xl border-2 transition', on ? 'border-ink bg-signal text-signal-fg shadow-stamp-sm' : 'border-transparent text-muted hover:border-line')}
                >
                  <I className="size-5" />
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
