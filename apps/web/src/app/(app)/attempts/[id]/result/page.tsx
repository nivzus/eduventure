import type { Metadata } from 'next';
import { ResultScreen } from '@/features/quiz/components/result/ResultScreen';

export const metadata: Metadata = { title: 'Nəticə' };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultScreen id={id} />;
}
