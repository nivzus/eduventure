import { AttemptPlayer } from '@/features/quiz/components/player/AttemptPlayer';

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttemptPlayer id={id} />;
}
