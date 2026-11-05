import type { Metadata } from 'next';
import { QuizAnalyticsScreen } from '@/features/admin/screens/QuizAnalyticsScreen';

export const metadata: Metadata = { title: 'Test analizi' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizAnalyticsScreen id={id} />;
}
