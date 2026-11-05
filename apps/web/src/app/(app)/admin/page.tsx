import type { Metadata } from 'next';
import { OverviewScreen } from '@/features/admin/screens/OverviewScreen';

export const metadata: Metadata = { title: 'Admin paneli' };

export default function Page() {
  return <OverviewScreen />;
}
