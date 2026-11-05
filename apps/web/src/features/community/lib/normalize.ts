import type { ArticleLite, CommentNode, Group, QuestPeriod, QuestType, QuestView } from '../types';

type Dict = Record<string, unknown>;
const isObj = (v: unknown): v is Dict => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d = 0): number => (typeof v === 'number' && !Number.isNaN(v) ? v : d);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/**
 * `GET /quests` → "active + my progress". The contract does not pin the exact
 * shape, so accept: flat quest with progress fields, `{...quest, userQuest}`,
 * `{...quest, my: {...}}`, or `{quest, progress,...}` (UserQuest with quest).
 */
export function normalizeQuest(raw: unknown): QuestView | null {
  if (!isObj(raw)) return null;
  const q: Dict = isObj(raw.quest) ? { ...raw.quest, ...pick(raw, ['progress', 'completedAt', 'claimedAt']) } : raw;
  const uq: Dict =
    (isObj(raw.userQuest) && raw.userQuest) ||
    (isObj(raw.my) && raw.my) ||
    (isObj(raw.mine) && raw.mine) ||
    (Array.isArray(raw.userQuests) && isObj(raw.userQuests[0]) && (raw.userQuests[0] as Dict)) ||
    q;
  const id = str(q.id) ?? str(raw.questId);
  if (!id) return null;
  return {
    id,
    title: str(q.title) ?? 'Tapşırıq',
    description: str(q.description),
    type: (str(q.type) ?? 'COMPLETE_QUIZZES') as QuestType,
    target: Math.max(1, num(q.target, 1)),
    xpReward: num(q.xpReward),
    period: (str(q.period) ?? 'DAILY') as QuestPeriod,
    progress: num(uq.progress),
    completedAt: str(uq.completedAt),
    claimedAt: str(uq.claimedAt),
  };
}

function pick(o: Dict, keys: string[]): Dict {
  const out: Dict = {};
  for (const k of keys) if (k in o) out[k] = o[k];
  return out;
}

export function questState(q: QuestView): 'claimed' | 'claimable' | 'progress' {
  if (q.claimedAt) return 'claimed';
  if (q.completedAt || q.progress >= q.target) return 'claimable';
  return 'progress';
}

/** Comments may arrive threaded (`replies`/`children`) or flat with parentId. */
export function buildCommentTree(list: CommentNode[]): CommentNode[] {
  const alreadyThreaded = list.some((c) => (c.replies?.length ?? 0) > 0 || (c.children?.length ?? 0) > 0);
  if (alreadyThreaded) {
    const fix = (c: CommentNode): CommentNode => ({ ...c, replies: (c.replies ?? c.children ?? []).map(fix) });
    return list.filter((c) => !c.parentId).map(fix);
  }
  const map = new Map<string, CommentNode>();
  list.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  const roots: CommentNode[] = [];
  map.forEach((c) => {
    const parent = c.parentId ? map.get(c.parentId) : undefined;
    if (parent) parent.replies!.push(c);
    else roots.push(c);
  });
  const sort = (arr: CommentNode[]) => arr.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  sort(roots).forEach((r) => sort(r.replies!));
  return roots;
}

export function countComments(list: CommentNode[]): number {
  return list.reduce((n, c) => n + 1 + countComments(c.replies ?? c.children ?? []), 0);
}

export function memberCount(g: Group): number {
  return g.memberCount ?? g._count?.members ?? g.members?.length ?? 0;
}

export function articleProgress(a: ArticleLite): number {
  const p = a.myProgress;
  if (p == null) return 0;
  if (typeof p === 'number') return p;
  return num(p.progress);
}

/** Accept a plain array or `{ items: [] }` / `{ data: [] }` envelopes. */
export function asList<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (isObj(v)) {
    for (const k of ['items', 'data', 'results', 'rows']) if (Array.isArray(v[k])) return v[k] as T[];
  }
  return [];
}
