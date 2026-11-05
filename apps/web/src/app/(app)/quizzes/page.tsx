import type { Metadata } from 'next';
import { QuizDiscovery } from '@/features/quiz/components/discovery/QuizDiscovery';

export const metadata: Metadata = { title: 'Testlər' };

export default function QuizzesPage() {
  return <QuizDiscovery />;
}
