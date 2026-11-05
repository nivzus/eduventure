import type { Metadata } from 'next';
import { GroupDetailScreen } from '@/features/community/screens/GroupDetailScreen';

export const metadata: Metadata = { title: 'Qrup' };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetailScreen id={id} />;
}
