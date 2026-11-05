import type { Metadata } from 'next';
import { GroupsScreen } from '@/features/community/screens/GroupsScreen';

export const metadata: Metadata = { title: 'Qruplarım' };

export default function GroupsPage() {
  return <GroupsScreen />;
}
