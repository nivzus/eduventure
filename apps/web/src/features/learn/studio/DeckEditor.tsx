'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardPaste, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Input, Modal, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDeck, useSaveDeck } from '../hooks';
import type { ContentStatus, Deck, DeckInput } from '../types';
import {
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

interface CardRow {
  key: string;
  id?: string;
  front: string;
  back: string;
  example: string;
}

interface DeckForm extends VisibilityValue {
  title: string;
  description: string;
  category: string;
  status: ContentStatus;
  cards: CardRow[];
}

const blank = (): CardRow => ({ key: uid(), front: '', back: '', example: '' });

const fromDeck = (d: Deck): DeckForm => ({
  title: d.title ?? '',
  description: d.description ?? '',
  category: d.category ?? '',
  status: d.status,
  cards: [...(d.cards ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ key: c.id, id: c.id, front: c.front, back: c.back, example: c.example ?? '' })),
  visibility: d.visibility,
  passcode: d.passcode ?? '',
  groupIds: d.groupIds ?? [],
});

export function DeckEditorScreen({ id }: { id: string }) {
  const isNew = id === 'new';
  const q = useDeck(isNew ? undefined : id);
  const empty = useMemo<DeckForm>(
    () => ({ title: '', description: '', category: '', status: 'DRAFT', cards: [blank(), blank(), blank()], visibility: 'PUBLIC', passcode: '', groupIds: [] }),
    [],
  );
  return (
    <StudioGuard>
      {isNew ? (
        <DeckEditor id={id} initial={empty} />
      ) : q.isLoading ? (
        <EditorSkeleton />
      ) : q.isError || !q.data ? (
        <EditorNotFound backHref="/studio/decks" label="Mənim dəstlərim" />
      ) : (
        <DeckEditor key={q.data.id} id={q.data.id} initial={fromDeck(q.data)} />
      )}
    </StudioGuard>
  );
}

const isEmpty = (c: CardRow) => !c.front.trim() && !c.back.trim() && !c.example.trim();
const isInvalid = (c: CardRow) => !isEmpty(c) && (!c.front.trim() || !c.back.trim());

/** "front ; back ; example" per line (tabs also work — paste from a spreadsheet). */
function parseBulk(text: string): { cards: CardRow[]; bad: number } {
  let bad = 0;
  const cards: CardRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = (line.includes(';') ? line.split(';') : line.split('\t')).map((p) => p.trim());
    const [front = '', back = '', ...rest] = parts;
    if (!front || !back) {
      bad++;
      continue;
    }
    cards.push({ key: uid(), front, back, example: rest.join('; ').trim() });
  }
  return { cards, bad };
}

function DeckEditor({ id, initial }: { id: string; initial: DeckForm }) {
  const isNew = id === 'new';
  const router = useRouter();
  const save = useSaveDeck();
  const { form, patch, dirty, markSaved } = useEditorState(initial);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const setCard = (key: string, p: Partial<CardRow>) => patch({ cards: form.cards.map((c) => (c.key === key ? { ...c, ...p } : c)) });
  const addCard = () => {
    const c = blank();
    setFocusKey(c.key);
    patch({ cards: [...form.cards, c] });
  };
  const filled = form.cards.filter((c) => !isEmpty(c)).length;

  const onSave = async () => {
    if (save.isPending) return;
    if (!form.title.trim()) return toast.error('Dəstin adını yazın');
    const vErr = visibilityError(form);
    if (vErr) return toast.error(vErr);
    const badIdx = form.cards.findIndex(isInvalid);
    if (badIdx >= 0) {
      setShowErrors(true);
      return toast.error(`${badIdx + 1}-ci kartın həm üzü, həm arxası olmalıdır`);
    }
    const body: DeckInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      status: form.status,
      cards: form.cards
        .filter((c) => !isEmpty(c))
        .map((c) => ({ ...(c.id ? { id: c.id } : {}), front: c.front.trim(), back: c.back.trim(), example: c.example.trim() || null })),
      ...visibilityBody(form),
    };
    try {
      const saved = await save.mutateAsync({ id: isNew ? undefined : id, body });
      setShowErrors(false);
      markSaved();
      toast.success(isNew ? 'Kart dəsti yaradıldı' : 'Yadda saxlandı');
      if (isNew) router.replace(`/studio/decks/${saved.id}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Yadda saxlamaq alınmadı'));
    }
  };

  return (
    <EditorShell
      backHref="/studio/decks"
      backLabel="dəstlərim"
      kind="kart dəsti"
      title={form.title}
      status={form.status}
      isNew={isNew}
      dirty={dirty}
      saving={save.isPending}
      onSave={onSave}
      viewHref={`/decks/${id}`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TitleSheet
          title={form.title}
          onTitle={(title) => patch({ title })}
          description={form.description}
          onDescription={(description) => patch({ description })}
          descLabel="təsvir"
          placeholder="Dəstin adı… (məs. B1 — gündəlik sözlər)"
        >
          <div className="mt-4 max-w-xs">
            <Input value={form.category} onChange={(e) => patch({ category: e.target.value })} placeholder="Kateqoriya (məs. Lüğət)" maxLength={80} aria-label="Kateqoriya" inputSize="sm" />
          </div>
        </TitleSheet>
        <Panel label="Dərc və görünmə">
          <StatusPicker value={form.status} onChange={(status) => patch({ status })} />
          <div className="mt-4">
            <VisibilityFields value={form} onChange={(v) => patch(v)} />
          </div>
        </Panel>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl">Kartlar</h2>
            <p className="hand text-xl text-muted">{filled} kart · üz → arxa → nümunə</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<ClipboardPaste />} onClick={() => setBulkOpen(true)}>
              Toplu əlavə
            </Button>
            <Button size="sm" leftIcon={<Plus />} onClick={addCard}>
              Kart
            </Button>
          </div>
        </div>

        <SortableList items={form.cards} onReorder={(cards) => patch({ cards })} grid className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(c, i) => {
            const bad = showErrors && isInvalid(c);
            return (
              <SortableItem key={c.key} id={c.key}>
                {(handle, dragging) => (
                  <div
                    className={cn(
                      'h-full rounded-2xl border-2 bg-elev p-3 transition-shadow',
                      bad ? 'border-danger' : 'border-ink',
                      dragging ? 'shadow-stamp' : 'shadow-stamp-sm',
                    )}
                  >
                    <div className="mb-2 flex items-center gap-1">
                      {handle}
                      <span className="hand text-lg text-muted">#{i + 1}</span>
                      <IconButton
                        label="Kartı sil"
                        size="sm"
                        icon={<Trash2 className="size-4" />}
                        className="ml-auto text-danger"
                        onClick={() => patch({ cards: form.cards.filter((x) => x.key !== c.key) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={c.front}
                        onChange={(e) => setCard(c.key, { front: e.target.value })}
                        placeholder="Üz — söz / ifadə"
                        aria-label={`${i + 1}-ci kartın üzü`}
                        autoFocus={focusKey === c.key}
                        invalid={bad && !c.front.trim()}
                        className="font-display font-semibold"
                        maxLength={2000}
                      />
                      <Input
                        value={c.back}
                        onChange={(e) => setCard(c.key, { back: e.target.value })}
                        placeholder="Arxa — tərcümə / izah"
                        aria-label={`${i + 1}-ci kartın arxası`}
                        invalid={bad && !c.back.trim()}
                        maxLength={4000}
                      />
                      <Textarea
                        value={c.example}
                        onChange={(e) => setCard(c.key, { example: e.target.value })}
                        placeholder="Nümunə cümlə (istəyə görə)"
                        aria-label={`${i + 1}-ci kartın nümunəsi`}
                        rows={2}
                        className="text-sm italic"
                        maxLength={4000}
                      />
                    </div>
                  </div>
                )}
              </SortableItem>
            );
          }}
        </SortableList>
        <button
          type="button"
          onClick={addCard}
          className="mt-4 grid w-full place-items-center rounded-2xl border-2 border-dashed border-line-strong py-6 text-muted hover:border-ink hover:text-fg"
        >
          <span className="hand inline-flex items-center gap-2 text-2xl">
            <Plus className="size-5" /> yeni kart
          </span>
        </button>
      </section>

      <BulkPasteModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onAdd={(cards) => patch({ cards: [...form.cards.filter((c) => !isEmpty(c)), ...cards] })}
      />
    </EditorShell>
  );
}

function BulkPasteModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (cards: CardRow[]) => void }) {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseBulk(text), [text]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Toplu əlavə"
      description="Hər sətirdə bir kart: üz ; arxa ; nümunə (nümunə istəyə görədir)."
      footer={
        <>
          <span className="mr-auto text-sm text-muted">
            {parsed.cards.length} kart hazırdır{parsed.bad ? ` · ${parsed.bad} sətir buraxılacaq` : ''}
          </span>
          <Button variant="ghost" onClick={onClose}>Ləğv et</Button>
          <Button
            disabled={!parsed.cards.length}
            onClick={() => {
              onAdd(parsed.cards);
              toast.success(`${parsed.cards.length} kart əlavə olundu`);
              setText('');
              onClose();
            }}
          >
            Əlavə et
          </Button>
        </>
      }
    >
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        autoFocus
        aria-label="Kartlar"
        placeholder={'apple ; alma ; I eat an apple every day.\nreliable ; etibarlı ; She is a reliable friend.\nborrow ; borc almaq'}
        className="font-mono text-[13px] leading-6"
      />
    </Modal>
  );
}
