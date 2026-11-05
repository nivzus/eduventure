import type { Metadata } from 'next';
import { DecksScreen } from '@/features/learn/screens/DecksScreen';

export const metadata: Metadata = { title: 'Fləşkartlar' };

export default function DecksPage() {
  return <DecksScreen />;
}
