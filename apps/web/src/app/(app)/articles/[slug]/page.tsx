import { ArticleReaderScreen } from '@/features/learn/screens/ArticleReaderScreen';

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleReaderScreen slug={slug} />;
}
