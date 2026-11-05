import type { Metadata } from 'next';
import { BookmarksScreen } from '@/features/learn/screens/BookmarksScreen';

export const metadata: Metadata = { title: 'Seçilmişlər' };

export default function BookmarksPage() {
  return <BookmarksScreen />;
}
