import type { Metadata } from 'next';
import { StudyScreen } from '@/features/learn/screens/StudyScreen';

export const metadata: Metadata = { title: 'Təkrar' };

export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudyScreen id={id} />;
}
