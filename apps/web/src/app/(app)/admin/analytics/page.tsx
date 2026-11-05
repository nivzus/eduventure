import type { Metadata } from 'next';
import { AnalyticsScreen } from '@/features/admin/screens/AnalyticsScreen';

export const metadata: Metadata = { title: 'Analitika' };

export default function Page() {
  return <AnalyticsScreen />;
}
