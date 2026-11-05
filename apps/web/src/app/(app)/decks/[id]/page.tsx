import { DeckScreen } from '@/features/learn/screens/DeckScreen';

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeckScreen id={id} />;
}
