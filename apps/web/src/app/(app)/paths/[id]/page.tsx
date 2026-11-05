import { PathScreen } from '@/features/learn/screens/PathScreen';

export default async function PathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PathScreen id={id} />;
}
