import type { Metadata } from 'next';
import { CoursesScreen } from '@/features/learn/screens/CoursesScreen';

export const metadata: Metadata = { title: 'Kurslar' };

export default function CoursesPage() {
  return <CoursesScreen />;
}
