'use client';

import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bold, Check, Heading2, Italic, Link2, List, Quote, Search, Table, X, type LucideIcon } from 'lucide-react';
import { Input, Segmented, Skeleton } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Note } from '@/components/notebook';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Markdown } from '../components/articles/Markdown';
import { useArticle, useArticleCategories, useArticles, useQuizOptions, useSaveArticle } from '../hooks';
import { readingMinutes, wordCount } from '../lib/format';
import { relatedQuizzesOf } from '../lib/normalize';
import type { Article, ArticleInput, ContentStatus } from '../types';
import {
  CoverField,
  EditorNotFound,
  EditorShell,
  EditorSkeleton,
  Panel,
  StatusPicker,
  StudioGuard,
  TagInput,
  TitleSheet,
  VisibilityFields,
  type VisibilityValue,
  useEditorState,
  visibilityBody,
  visibilityError,
} from './ui';

interface ArticleForm extends VisibilityValue {
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  tags: string[];
  status: ContentStatus;
  relatedQuizIds: string[];
}

const EMPTY: ArticleForm = {
  title: '',
  excerpt: '',
  content: '',
  coverUrl: '',
  category: '',
  tags: [],
  status: 'DRAFT',
  relatedQuizIds: [],
  visibility: 'PUBLIC',
  passcode: '',
  groupIds: [],
};

const fromArticle = (a: Article): ArticleForm => ({
  title: a.title ?? '',
  excerpt: a.excerpt ?? '',
  content: a.content ?? '',
  coverUrl: a.coverUrl ?? '',
  category: a.category ?? '',
  tags: a.tags ?? [],
  status: a.status,
  relatedQuizIds: a.relatedQuizIds ?? relatedQuizzesOf(a).map((q) => q.id),
  visibility: a.visibility,
  passcode: a.passcode ?? '',
  groupIds: a.groupIds ?? [],
});

export function ArticleEditorScreen({ id }: { id: string }) {
  const isNew = id === 'new';
  const q = useArticle(isNew ? undefined : id);
  return (
    <StudioGuard>
      {isNew ? (
        <ArticleEditor id={id} initial={EMPTY} />
      ) : q.isLoading ? (
        <EditorSkeleton />
      ) : q.isError || !q.data ? (
        <EditorNotFound backHref="/studio/articles" label="Mənim məqalələrim" />
      ) : (
        <ArticleEditor key={q.data.id} id={q.data.id} initial={fromArticle(q.data)} slug={q.data.slug} />
      )}
    </StudioGuard>
  );
}

const TABLE = '| Söz | Tərcümə | Nümunə |\n| --- | --- | --- |\n| apple | alma | I eat an apple. |\n';

function ArticleEditor({ id, initial, slug }: { id: string; initial: ArticleForm; slug?: string }) {
  const isNew = id === 'new';
  const router = useRouter();
  const save = useSaveArticle();
  const { form, patch, dirty, markSaved } = useEditorState(initial);
  const mine = useArticles({ mine: true });
  const categories = useArticleCategories(mine.data);
  const [pane, setPane] = useState<'write' | 'preview'>('write');
  const ta = useRef<HTMLTextAreaElement>(null);
  const preview = useDeferredValue(form.content);

  const edit = (fn: (t: string, s: number, e: number) => { text: string; a: number; b: number }) => {
    const el = ta.current;
    const s = el?.selectionStart ?? form.content.length;
    const e = el?.selectionEnd ?? form.content.length;
    const r = fn(form.content, s, e);
    patch({ content: r.text });
    setPane('write');
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(r.a, r.b);
    });
  };
  const wrap = (before: string, after = before, ph = 'mətn') =>
    edit((t, s, e) => {
      const sel = t.slice(s, e) || ph;
      return { text: t.slice(0, s) + before + sel + after + t.slice(e), a: s + before.length, b: s + before.length + sel.length };
    });
  const prefix = (p: string) =>
    edit((t, s, e) => {
      const ls = t.lastIndexOf('\n', s - 1) + 1;
      const lines = t.slice(ls, e).split('\n');
      const all = lines.every((l) => l.startsWith(p));
      const block = lines.map((l) => (all ? l.slice(p.length) : p + l.replace(/^(#{1,6} |- |> )/, ''))).join('\n');
      return { text: t.slice(0, ls) + block + t.slice(e), a: ls, b: ls + block.length };
    });
  const insert = (snippet: string) =>
    edit((t, s, e) => {
      const pre = s > 0 && t[s - 1] !== '\n' ? '\n\n' : s > 1 && t[s - 2] !== '\n' ? '\n' : '';
      const pos = s + pre.length + snippet.length;
      return { text: t.slice(0, s) + pre + snippet + t.slice(e), a: pos, b: pos };
    });
  const link = () =>
    edit((t, s, e) => {
      const sel = t.slice(s, e) || 'link mətni';
      const ins = `[${sel}](https://)`;
      const a = s + sel.length + 3;
      return { text: t.slice(0, s) + ins + t.slice(e), a, b: a + 8 };
    });

  const tools: { label: string; icon: LucideIcon; run: () => void; key?: string }[] = [
    { label: 'Qalın (Ctrl+B)', icon: Bold, run: () => wrap('**'), key: 'b' },
    { label: 'Kursiv (Ctrl+I)', icon: Italic, run: () => wrap('_'), key: 'i' },
    { label: 'Başlıq', icon: Heading2, run: () => prefix('## ') },
    { label: 'Siyahı', icon: List, run: () => prefix('- ') },
    { label: 'Sitat', icon: Quote, run: () => prefix('> ') },
    { label: 'Cədvəl', icon: Table, run: () => insert(TABLE) },
    { label: 'Link (Ctrl+K)', icon: Link2, run: link, key: 'k' },
  ];

  const onSave = async () => {
    if (save.isPending) return;
    if (!form.title.trim()) return toast.error('Məqalənin adını yazın');
    const vErr = visibilityError(form);
    if (vErr) return toast.error(vErr);
    const body: ArticleInput = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      coverUrl: form.coverUrl.trim() || null,
      category: form.category.trim() || null,
      tags: form.tags,
      status: form.status,
      relatedQuizIds: form.relatedQuizIds,
      ...visibilityBody(form),
    };
    try {
      const saved = await save.mutateAsync({ id: isNew ? undefined : id, body });
      markSaved();
      toast.success(isNew ? 'Məqalə yaradıldı' : 'Yadda saxlandı');
      if (isNew) router.replace(`/studio/articles/${saved.id}`);
    } catch (e) {
      toast.error(errorMessage(e, 'Yadda saxlamaq alınmadı'));
    }
  };

  const words = wordCount(form.content);

  return (
    <EditorShell
      backHref="/studio/articles"
      backLabel="məqalələrim"
      kind="məqalə"
      title={form.title}
      status={form.status}
      isNew={isNew}
      dirty={dirty}
      saving={save.isPending}
      onSave={onSave}
      viewHref={slug ? `/articles/${slug}` : undefined}
    >
      <div className="space-y-6">
        <TitleSheet
          title={form.title}
          onTitle={(title) => patch({ title })}
          description={form.excerpt}
          onDescription={(excerpt) => patch({ excerpt })}
          descLabel="qısa giriş"
          placeholder="Məqalənin adı…"
        />

        <section className="overflow-hidden rounded-3xl border-2 border-ink bg-elev shadow-stamp">
          <div className="flex flex-wrap items-center gap-1 border-b-2 border-ink/80 bg-bg/60 px-2 py-2 sm:px-3">
            {tools.map((t) => (
              <button
                key={t.label}
                type="button"
                title={t.label}
                aria-label={t.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={t.run}
                className="grid size-9 place-items-center rounded-xl text-muted hover:bg-fg/[0.07] hover:text-fg"
              >
                <t.icon className="size-4" />
              </button>
            ))}
            <span className="ml-auto hidden font-mono text-[11px] text-subtle sm:inline">
              {words} söz · ~{readingMinutes(form.content)} dəq
            </span>
            <Segmented
              size="sm"
              className="ml-auto lg:hidden"
              value={pane}
              onChange={setPane}
              tabs={[
                { value: 'write', label: 'Yaz' },
                { value: 'preview', label: 'Önizləmə' },
              ]}
            />
          </div>
          <div className="grid lg:h-[70vh] lg:grid-cols-2 lg:divide-x-2 lg:divide-dashed lg:divide-line-strong">
            <div className={cn('min-h-0', pane === 'preview' && 'hidden lg:block')}>
              <textarea
                ref={ta}
                value={form.content}
                onChange={(e) => patch({ content: e.target.value })}
                onKeyDown={(e) => {
                  if (!(e.metaKey || e.ctrlKey)) return;
                  const tool = tools.find((t) => t.key === e.key.toLowerCase());
                  if (tool) {
                    e.preventDefault();
                    tool.run();
                  }
                }}
                spellCheck
                aria-label="Məqalənin mətni (Markdown)"
                placeholder={'## Giriş\n\nBurada **Markdown** ilə yaz…\n\n- siyahı\n> sitat'}
                className="block h-full min-h-[55vh] w-full resize-none bg-transparent p-4 font-mono text-[14px] leading-7 outline-none placeholder:text-subtle sm:p-6 lg:min-h-0"
              />
            </div>
            <div className={cn('min-h-[55vh] overflow-y-auto bg-bg/40 p-4 sm:p-6 lg:min-h-0', pane === 'write' && 'hidden lg:block')}>
              <Note className="text-lg !text-subtle">önizləmə</Note>
              {preview.trim() ? (
                <Markdown content={preview} variant="compact" className="mt-2" />
              ) : (
                <p className="hand mt-6 text-2xl text-muted">Yazmağa başla — nəticə burada görünəcək ✎</p>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Panel label="Dərc və görünmə">
            <StatusPicker value={form.status} onChange={(status) => patch({ status })} />
            <div className="mt-4">
              <VisibilityFields value={form} onChange={(v) => patch(v)} />
            </div>
          </Panel>
          <Panel label="Örtük şəkli">
            <CoverField value={form.coverUrl} onChange={(coverUrl) => patch({ coverUrl })} />
          </Panel>
          <Panel label="Kateqoriya və teqlər" className="md:col-span-2 xl:col-span-1">
            <Input
              value={form.category}
              onChange={(e) => patch({ category: e.target.value })}
              placeholder="məs. Qrammatika"
              list="studio-article-categories"
              maxLength={80}
              aria-label="Kateqoriya"
            />
            <datalist id="studio-article-categories">
              {categories.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
            <div className="mt-3">
              <TagInput value={form.tags} onChange={(tags) => patch({ tags })} />
            </div>
          </Panel>
          <Panel label="Əlaqəli testlər" className="md:col-span-2 xl:col-span-3">
            <QuizPicker value={form.relatedQuizIds} onChange={(relatedQuizIds) => patch({ relatedQuizIds })} />
          </Panel>
        </div>
      </div>
    </EditorShell>
  );
}

function QuizPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data, isLoading } = useQuizOptions();
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map((data ?? []).map((x) => [x.id, x])), [data]);
  const term = q.trim().toLocaleLowerCase('az');
  const list = (data ?? []).filter((x) => !term || x.title.toLocaleLowerCase('az').includes(term) || (x.category ?? '').toLocaleLowerCase('az').includes(term));
  const toggle = (qid: string) => onChange(value.includes(qid) ? value.filter((x) => x !== qid) : [...value, qid]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <p className="text-sm text-muted">Məqaləni oxuyandan sonra tələbəyə təklif olunacaq testlər.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {value.length ? (
            value.map((qid) => (
              <span key={qid} className="inline-flex max-w-full items-center gap-1 rounded-full border-2 border-ink bg-aurora/20 py-1 pl-3 pr-1 text-sm font-semibold">
                <span className="truncate">{byId.get(qid)?.title ?? 'Test'}</span>
                <button type="button" onClick={() => toggle(qid)} aria-label="Çıxar" className="rounded-full p-0.5 hover:bg-fg/10">
                  <X className="size-3.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="hand text-xl text-subtle">hələ seçilməyib</span>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-line">
        <div className="border-b border-line p-2">
          <Input inputSize="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Test axtar…" leftIcon={<Search className="size-4" />} aria-label="Test axtar" />
        </div>
        <ul className="max-h-60 overflow-y-auto p-1.5">
          {isLoading ? (
            <Skeleton className="h-9 rounded-xl" />
          ) : !list.length ? (
            <li className="hand px-2 py-2 text-lg text-muted">Test tapılmadı</li>
          ) : (
            list.map((x) => {
              const on = value.includes(x.id);
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => toggle(x.id)}
                    aria-pressed={on}
                    className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-fg/[0.05]', on && 'bg-signal/10')}
                  >
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded-md border-2', on ? 'border-ink bg-signal text-signal-fg' : 'border-line-strong')}>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{x.title}</span>
                    {x.category && <span className="hand shrink-0 text-base text-muted">{x.category}</span>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
