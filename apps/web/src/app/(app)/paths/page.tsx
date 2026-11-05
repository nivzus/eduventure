import type { Metadata } from 'next';
import { PathsScreen } from '@/features/learn/screens/PathsScreen';

export const metadata: Metadata = { title: 'Öyrənmə yolları' };

export default function PathsPage() {
  return <PathsScreen />;
}
