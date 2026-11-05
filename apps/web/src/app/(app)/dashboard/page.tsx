import type { Metadata } from 'next';
import { DashboardScreen } from '@/features/community/screens/DashboardScreen';

export const metadata: Metadata = { title: 'Baza düşərgəsi' };

export default function DashboardPage() {
  return <DashboardScreen />;
}
