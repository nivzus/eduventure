import type { Metadata } from 'next';
import { ArticlesScreen } from '@/features/learn/screens/ArticlesScreen';

export const metadata: Metadata = { title: 'Məqalələr' };

export default function ArticlesPage() {
  return <ArticlesScreen />;
}
