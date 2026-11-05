import type { Metadata } from 'next';
import { PracticeScreen } from '@/features/quiz/components/practice/PracticeScreen';

export const metadata: Metadata = { title: 'Ağıllı məşq' };

export default function PracticePage() {
  return <PracticeScreen />;
}
