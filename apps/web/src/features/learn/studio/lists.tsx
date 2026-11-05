'use client';

import {
  useArticles,
  useCourses,
  useDecks,
  useDeleteArticle,
  useDeleteCourse,
  useDeleteDeck,
  useDeletePath,
  usePaths,
} from '../hooks';
import { courseItemCount, deckCardCount, pathCourseCount } from '../lib/normalize';
import { StudioListScreen, type StudioRow } from './StudioList';

const base = (r: { id: string; title: string; status: StudioRow['status']; visibility: StudioRow['visibility']; passcode?: string | null; groupIds?: string[]; updatedAt?: string }) => ({
  id: r.id,
  title: r.title,
  status: r.status,
  visibility: r.visibility,
  passcode: r.passcode,
  groupIds: r.groupIds,
  updatedAt: r.updatedAt,
});

export function StudioArticlesScreen() {
  const q = useArticles({ mine: true });
  const del = useDeleteArticle();
  return (
    <StudioListScreen
      type="ARTICLE"
      title="Mənim"
      highlight="məqalələrim"
      description="Qrammatika izahları, lüğət siyahıları, oxu mətnləri — hamısı burada yazılır."
      newLabel="Yeni məqalə"
      base="/studio/articles"
      rows={q.data?.map((a) => ({ ...base(a), category: a.category, meta: `${a.readingMinutes ?? 1} dəq oxu`, viewHref: `/articles/${a.slug}` }))}
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={() => q.refetch()}
      onDelete={(id) => del.mutateAsync(id)}
      deleting={del.isPending}
      emptyText="Hələ məqalə yazmamısan — ilk qeydini et!"
    />
  );
}

export function StudioCoursesScreen() {
  const q = useCourses({ mine: true });
  const del = useDeleteCourse();
  return (
    <StudioListScreen
      type="COURSE"
      title="Mənim"
      highlight="kurslarım"
      description="Məqalə, test və kart dəstlərini addım-addım marşruta çevir."
      newLabel="Yeni kurs"
      base="/studio/courses"
      rows={q.data?.map((c) => ({
        ...base(c),
        category: c.category,
        meta: [c.level, `${courseItemCount(c)} addım`].filter(Boolean).join(' · '),
        viewHref: `/courses/${c.id}`,
      }))}
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={() => q.refetch()}
      onDelete={(id) => del.mutateAsync(id)}
      deleting={del.isPending}
      emptyText="Hələ kurs yoxdur — ilk marşrutu qur!"
    />
  );
}

export function StudioPathsScreen() {
  const q = usePaths({ mine: true });
  const del = useDeletePath();
  return (
    <StudioListScreen
      type="PATH"
      title="Mənim"
      highlight="yollarım"
      description="Kursları ardıcıl səyahətə birləşdir: A2-dən B1-ə, B1-dən B2-yə."
      newLabel="Yeni yol"
      base="/studio/paths"
      rows={q.data?.map((p) => ({ ...base(p), meta: `${pathCourseCount(p)} kurs`, viewHref: `/paths/${p.id}` }))}
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={() => q.refetch()}
      onDelete={(id) => del.mutateAsync(id)}
      deleting={del.isPending}
      emptyText="Hələ öyrənmə yolu yoxdur"
    />
  );
}

export function StudioDecksScreen() {
  const q = useDecks({ mine: true });
  const del = useDeleteDeck();
  return (
    <StudioListScreen
      type="DECK"
      title="Mənim"
      highlight="kart dəstlərim"
      description="Sözlər, ifadələr və nümunə cümlələr — təkrarla yadda qalsın."
      newLabel="Yeni dəst"
      base="/studio/decks"
      rows={q.data?.map((d) => ({ ...base(d), category: d.category, meta: `${deckCardCount(d)} kart`, viewHref: `/decks/${d.id}` }))}
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={() => q.refetch()}
      onDelete={(id) => del.mutateAsync(id)}
      deleting={del.isPending}
      emptyText="Hələ kart dəsti yoxdur"
    />
  );
}
