import { DeckEditorScreen } from '@/features/learn/studio/DeckEditor';

export default async function StudioDeckEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeckEditorScreen id={id} />;
}
