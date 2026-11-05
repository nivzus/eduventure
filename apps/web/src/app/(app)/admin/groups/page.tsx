import type { Metadata } from 'next';
import { GroupsScreen } from '@/features/admin/screens/GroupsScreen';

export const metadata: Metadata = { title: 'Qruplar' };

export default function Page() {
  return <GroupsScreen />;
}
