import { ArticleEditorScreen } from '@/features/learn/studio/ArticleEditor';

export default async function StudioArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArticleEditorScreen id={id} />;
}
