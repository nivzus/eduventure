import type { Metadata } from 'next';
import { ReviewScreen } from '@/features/quiz/components/review/ReviewScreen';

export const metadata: Metadata = { title: 'Cavablar' };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewScreen id={id} />;
}
