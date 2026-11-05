'use client';

import { Check, Highlighter, NotebookPen, PenLine, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCreateAnnotation, useDeleteAnnotation, useUpdateAnnotation } from '../../hooks';
import { HIGHLIGHT_COLORS, HIGHLIGHT_LABEL } from '../../lib/content-meta';
import { relativeTime } from '../../lib/format';
import {
  clearHighlight,
  highlightsSupported,
  offsetAtPoint,
  plainTextOf,
  rangeToOffsets,
  resolveAnnotationRange,
  setHighlight,
} from '../../lib/text-ranges';
import type { Annotation, HighlightColor } from '../../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface Anchor {
  /** horizontal centre, relative to wrapper */
  x: number;
  top: number;
  bottom: number;
  /** viewport top of the anchor (decides above/below placement) */
  vTop: number;
}

type Pop =
  | { kind: 'selection'; start: number; end: number; quote: string; anchor: Anchor; mode: 'toolbar' | 'note' }
  | { kind: 'edit'; id: string; anchor: Anchor };

function anchorOf(range: Range, wrap: HTMLElement): Anchor {
  const rects = range.getClientRects();
  const first = rects[0] ?? range.getBoundingClientRect();
  const b = range.getBoundingClientRect();
  const w = wrap.getBoundingClientRect();
  const left = rects.length > 1 ? first.left : b.left;
  const right = rects.length > 1 ? first.right : b.right;
  return { x: (left + right) / 2 - w.left, top: first.top - w.top, bottom: b.bottom - w.top, vTop: first.top };
}

const swatch: Record<HighlightColor, string> = {
  signal: 'bg-[#E8FF59]',
  ember: 'bg-[#FF6B3D]',
  aurora: 'bg-[#9B7BFF]',
  glacier: 'bg-[#7CE7FF]',
};
export const swatchBar: Record<HighlightColor, string> = {
  signal: 'bg-[#E8FF59]',
  ember: 'bg-[#FF6B3D]',
  aurora: 'bg-[#9B7BFF]',
  glacier: 'bg-[#7CE7FF]',
};

/**
 * Wires selection → highlight/note creation, click-on-highlight → edit, and renders highlights
 * with the CSS Custom Highlight API (no DOM mutation inside the React-managed markdown tree).
 */
export function useAnnotationEngine({
  articleId,
  bodyRef,
  wrapRef,
  annotations,
  contentKey,
}: {
  articleId: string;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  annotations: Annotation[];
  contentKey: string;
}) {
  const [pop, setPop] = useState<Pop | null>(null);
  const [version, setVersion] = useState(0);
  const ranges = useRef(new Map<string, Range>());
  const popRef = useRef<HTMLDivElement | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── highlights ──
  const recompute = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const text = plainTextOf(body);
    const map = new Map<string, Range>();
    const byColor: Record<HighlightColor, Range[]> = { signal: [], ember: [], aurora: [], glacier: [] };
    for (const a of annotations) {
      const r = resolveAnnotationRange(body, text, a);
      if (!r) continue;
      map.set(a.id, r);
      (byColor[a.color] ?? byColor.signal).push(r);
    }
    ranges.current = map;
    for (const c of HIGHLIGHT_COLORS) setHighlight(`ev-${c}`, byColor[c]);
    setVersion((v) => v + 1);
  }, [annotations, bodyRef]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute, contentKey]);

  useEffect(
    () => () => {
      for (const c of HIGHLIGHT_COLORS) clearHighlight(`ev-${c}`);
      clearHighlight('ev-active');
      clearHighlight('ev-flash');
    },
    [],
  );

  // active underline for the annotation being edited
  useEffect(() => {
    const r = pop?.kind === 'edit' ? ranges.current.get(pop.id) : undefined;
    setHighlight('ev-active', r ? [r] : []);
  }, [pop, version]);

  // ── selection handling ──
  const inspect = useCallback(
    (point?: { x: number; y: number }) => {
      const body = bodyRef.current;
      const wrap = wrapRef.current;
      if (!body || !wrap) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (!body.contains(range.commonAncestorContainer)) return;
        const offs = rangeToOffsets(body, range);
        const quote = range.toString();
        if (!offs || !quote.trim()) return;
        setPop({ kind: 'selection', ...offs, quote, anchor: anchorOf(range, wrap), mode: 'toolbar' });
        return;
      }
      if (point) {
        const off = offsetAtPoint(body, point.x, point.y);
        if (off == null) return setPop(null);
        const hit = [...annotations]
          .sort((a, b) => a.endOffset - a.startOffset - (b.endOffset - b.startOffset))
          .find((a) => {
            const r = ranges.current.get(a.id);
            return r && a.startOffset <= off && off < a.endOffset;
          });
        if (hit) {
          const r = ranges.current.get(hit.id)!;
          setPop({ kind: 'edit', id: hit.id, anchor: anchorOf(r, wrap) });
        } else setPop(null);
      }
    },
    [annotations, bodyRef, wrapRef],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const inPop = (t: EventTarget | null) => Boolean(t && popRef.current?.contains(t as Node));
    const onUp = (e: PointerEvent) => {
      if (inPop(e.target) || e.button !== 0) return;
      const point = { x: e.clientX, y: e.clientY };
      setTimeout(() => inspect(point), 10);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey) inspect();
    };
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('keyup', onKey);
    // touch: selection handles don't fire pointerup on the wrapper reliably
    let t: ReturnType<typeof setTimeout> | null = null;
    const onSel = () => {
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => inspect(), 450);
    };
    document.addEventListener('selectionchange', onSel);
    const onDown = (e: PointerEvent) => {
      if (inPop(e.target)) return;
      if (!wrap.contains(e.target as Node)) setPop(null);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setPop(null);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('keyup', onKey);
      document.removeEventListener('selectionchange', onSel);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onEsc);
      if (t) clearTimeout(t);
    };
  }, [inspect, wrapRef]);

  const flash = useCallback((id: string, scroll = true) => {
    const r = ranges.current.get(id);
    if (!r) return;
    if (scroll) {
      const rect = r.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight * 0.3, behavior: 'smooth' });
    }
    setHighlight('ev-flash', [r]);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => clearHighlight('ev-flash'), 1400);
  }, []);

  const openEditor = useCallback(
    (id: string) => {
      const r = ranges.current.get(id);
      const wrap = wrapRef.current;
      if (!r || !wrap) return;
      flash(id);
      setTimeout(() => setPop({ kind: 'edit', id, anchor: anchorOf(r, wrap) }), 450);
    },
    [flash, wrapRef],
  );

  const topOf = useCallback(
    (id: string): number | null => {
      const r = ranges.current.get(id);
      const wrap = wrapRef.current;
      if (!r || !wrap) return null;
      return r.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
    },
    [wrapRef],
  );

  return { pop, setPop, popRef, version, recompute, flash, openEditor, topOf, articleId, supported: highlightsSupported() };
}

export type AnnotationEngine = ReturnType<typeof useAnnotationEngine>;

// ───────────────────────────── Popover ─────────────────────────────

export function AnnotationPopover({
  engine,
  annotations,
  wrapWidth,
}: {
  engine: AnnotationEngine;
  annotations: Annotation[];
  wrapWidth: number;
}) {
  const { pop } = engine;
  const popKey = pop ? (pop.kind === 'edit' ? `e-${pop.id}` : `s-${pop.start}-${pop.end}`) : 'none';
  return (
    <AnimatePresence>
      {pop && <PopoverBody key={popKey} pop={pop} engine={engine} annotations={annotations} wrapWidth={wrapWidth} />}
    </AnimatePresence>
  );
}

function PopoverBody({
  pop,
  engine,
  annotations,
  wrapWidth,
}: {
  pop: Pop;
  engine: AnnotationEngine;
  annotations: Annotation[];
  wrapWidth: number;
}) {
  const { setPop, popRef, articleId } = engine;
  const create = useCreateAnnotation(articleId);
  const update = useUpdateAnnotation(articleId);
  const remove = useDeleteAnnotation(articleId);
  const reduce = useReducedMotion();
  const editing = pop.kind === 'edit' ? annotations.find((a) => a.id === pop.id) : undefined;
  const [note, setNote] = useState(editing?.note ?? '');
  const [color, setColor] = useState<HighlightColor>(editing?.color ?? 'signal');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNoteMode = pop.kind === 'edit' || pop.mode === 'note';
  const width = isNoteMode ? Math.min(340, wrapWidth) : 296;
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const below = coarse || pop.anchor.vTop < 170;
  const half = width / 2;
  const left = Math.min(Math.max(pop.anchor.x, half), Math.max(half, wrapWidth - half));

  const clearSelection = () => window.getSelection()?.removeAllRanges();

  const saveNew = (c: HighlightColor, withNote?: string) => {
    if (pop.kind !== 'selection') return;
    create.mutate(
      { quote: pop.quote, startOffset: pop.start, endOffset: pop.end, color: c, note: withNote?.trim() || null },
      {
        onSuccess: () => {
          clearSelection();
          setPop(null);
          if (withNote?.trim()) toast.success('Qeyd saxlanıldı');
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  const saveEdit = () => {
    if (!editing) return;
    update.mutate(
      { id: editing.id, note: note.trim() || null, color },
      { onSuccess: () => setPop(null), onError: (e) => toast.error(errorMessage(e)) },
    );
  };

  const recolor = (c: HighlightColor) => {
    setColor(c);
    if (editing && c !== editing.color) update.mutate({ id: editing.id, color: c });
  };

  return (
      <motion.div
        ref={popRef}
        role="dialog"
        aria-label={pop.kind === 'edit' ? 'Qeydi redaktə et' : 'Seçilmiş mətn'}
        initial={reduce ? false : { opacity: 0, y: below ? -6 : 6, scale: 0.96, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="ev-noprint absolute z-40"
        style={{
          left,
          top: below ? pop.anchor.bottom + 12 : pop.anchor.top - 12,
          width,
          translateX: '-50%',
          translateY: below ? '0%' : '-100%',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-pop"
        >
          {!isNoteMode && pop.kind === 'selection' ? (
            <div className="flex items-center gap-1 p-1.5">
              <span className="px-2 text-subtle" aria-hidden>
                <Highlighter className="size-4" />
              </span>
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => saveNew(c)}
                  disabled={create.isPending}
                  aria-label={`${HIGHLIGHT_LABEL[c]} rəngi ilə işarələ`}
                  title={HIGHLIGHT_LABEL[c]}
                  className="grid size-9 place-items-center rounded-xl transition-colors hover:bg-fg/10"
                >
                  <span className={cn('size-4 rounded-full ring-2 ring-surface ring-offset-0', swatch[c])} />
                </button>
              ))}
              <span className="mx-1 h-6 w-px bg-line" aria-hidden />
              <button
                type="button"
                onClick={() => setPop({ ...pop, mode: 'note' })}
                className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-fg/10"
              >
                <PenLine className="size-4" /> Qeyd
              </button>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="mono-label">{pop.kind === 'edit' ? 'Şəxsi qeyd' : 'Yeni qeyd'}</p>
                <button
                  type="button"
                  onClick={() => setPop(null)}
                  aria-label="Bağla"
                  className="-mt-1 -mr-1 grid size-7 place-items-center rounded-full text-subtle hover:bg-fg/10 hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              </div>
              <blockquote className="mt-2 line-clamp-3 border-l-2 border-line-strong pl-3 font-serif text-[15px] text-muted italic">
                {pop.kind === 'edit' ? editing?.quote : pop.quote}
              </blockquote>
              <Textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (pop.kind === 'edit') saveEdit();
                    else saveNew(color, note);
                  }
                }}
                placeholder="Fikrini, tərcüməni və ya sualını yaz…"
                rows={3}
                className="mt-3 resize-none text-sm"
              />
              <div className="mt-3 flex items-center gap-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => recolor(c)}
                    aria-label={HIGHLIGHT_LABEL[c]}
                    aria-pressed={color === c}
                    className={cn(
                      'grid size-8 place-items-center rounded-full border-2 transition-colors',
                      color === c ? 'border-fg' : 'border-transparent hover:border-line-strong',
                    )}
                  >
                    <span className={cn('size-4 rounded-full', swatch[c])} />
                  </button>
                ))}
                <div className="flex-1" />
                {pop.kind === 'edit' &&
                  (confirmDelete ? (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={remove.isPending}
                      onClick={() =>
                        editing &&
                        remove.mutate(editing.id, {
                          onSuccess: () => {
                            setPop(null);
                            toast.info('Qeyd silindi');
                          },
                          onError: (e) => toast.error(errorMessage(e)),
                        })
                      }
                    >
                      Sil?
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      aria-label="Qeydi sil"
                      className="grid size-8 place-items-center rounded-full text-subtle hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ))}
                <Button
                  size="sm"
                  loading={create.isPending || update.isPending}
                  onClick={() => (pop.kind === 'edit' ? saveEdit() : saveNew(color, note))}
                  leftIcon={<Check className="size-4" />}
                >
                  Saxla
                </Button>
              </div>
            </div>
          )}
        </motion.div>
        {/* pointer nub */}
        <span
          aria-hidden
          className={cn(
            'absolute left-1/2 size-3 -translate-x-1/2 rotate-45 border-line-strong bg-surface',
            below ? '-top-1.5 border-t border-l' : '-bottom-1.5 border-r border-b',
          )}
          style={{ marginLeft: pop.anchor.x - left }}
        />
      </motion.div>
  );
}

// ───────────────────────────── Margin notes ─────────────────────────────

function NoteCard({
  a,
  onOpen,
  compact,
}: {
  a: Annotation;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative block w-full overflow-hidden rounded-2xl border border-line bg-elev text-left transition-colors hover:border-line-strong hover:bg-surface',
        compact ? 'p-3 pl-4' : 'p-4 pl-5',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', swatchBar[a.color])} aria-hidden />
      <p className="line-clamp-2 font-serif text-[15px] leading-snug text-muted italic">“{a.quote}”</p>
      {a.note ? (
        <p className="mt-2 line-clamp-4 text-sm text-fg">{a.note}</p>
      ) : (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-subtle group-hover:text-muted">
          <NotebookPen className="size-3.5" /> Qeyd əlavə et
        </p>
      )}
      {a.createdAt && <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">{relativeTime(a.createdAt)}</p>}
    </button>
  );
}

/** Notes aligned to their highlights in the right margin, pushed down to avoid overlaps. */
export function MarginNotes({ engine, annotations }: { engine: AnnotationEngine; annotations: Annotation[] }) {
  const refs = useRef(new Map<string, HTMLDivElement>());
  const [tops, setTops] = useState<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { topOf, version } = engine;

  const layout = useCallback(() => {
    if (!containerRef.current || containerRef.current.offsetParent === null) return;
    const items = annotations
      .map((a) => ({ a, want: topOf(a.id) }))
      .filter((x): x is { a: Annotation; want: number } => x.want !== null)
      .sort((x, y) => x.want - y.want);
    const next: Record<string, number> = {};
    let floor = 0;
    for (const { a, want } of items) {
      const top = Math.max(want - 6, floor);
      next[a.id] = top;
      floor = top + (refs.current.get(a.id)?.offsetHeight ?? 96) + 12;
    }
    setTops((prev) => {
      const same = Object.keys(next).length === Object.keys(prev).length && Object.entries(next).every(([k, v]) => Math.abs((prev[k] ?? -1) - v) < 1);
      return same ? prev : next;
    });
  }, [annotations, topOf]);

  useLayoutEffect(() => {
    layout();
  }, [layout, version]);

  useEffect(() => {
    const ro = new ResizeObserver(() => layout());
    if (containerRef.current?.parentElement) ro.observe(containerRef.current.parentElement);
    document.fonts?.ready.then(() => layout()).catch(() => {});
    window.addEventListener('resize', layout);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', layout);
    };
  }, [layout]);

  const height = useMemo(() => {
    const vals = Object.entries(tops).map(([id, t]) => t + (refs.current.get(id)?.offsetHeight ?? 96));
    return vals.length ? Math.max(...vals) : 0;
  }, [tops]);

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: height }}>
      {annotations.length === 0 && (
        <div className="sticky top-32 rounded-2xl border border-dashed border-line p-4 text-sm text-subtle">
          <Highlighter className="mb-2 size-4" />
          Mətndən hissə seç — rənglə işarələ və ya qeyd yaz. Qeydlərin burada, kənarda görünəcək.
        </div>
      )}
      {annotations.map((a) => (
        <motion.div
          key={a.id}
          ref={(el) => {
            if (el) refs.current.set(a.id, el);
            else refs.current.delete(a.id);
          }}
          className="absolute inset-x-0"
          initial={reduce ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: tops[a.id] === undefined ? 0 : 1, x: 0, top: tops[a.id] ?? 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        >
          <NoteCard a={a} onOpen={() => engine.openEditor(a.id)} compact />
        </motion.div>
      ))}
    </div>
  );
}

/** Stacked list of notes (narrow layouts, below the article). */
export function NotesList({ engine, annotations }: { engine: AnnotationEngine; annotations: Annotation[] }) {
  const sorted = [...annotations].sort((a, b) => a.startOffset - b.startOffset);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AnimatePresence initial={false}>
        {sorted.map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <NoteCard a={a} onOpen={() => engine.openEditor(a.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
