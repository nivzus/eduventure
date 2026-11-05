import type { Metadata } from 'next';
import { GroupDetailScreen } from '@/features/admin/screens/GroupDetailScreen';

export const metadata: Metadata = { title: 'Qrup' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupDetailScreen id={id} />;
}
