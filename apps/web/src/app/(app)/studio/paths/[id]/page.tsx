import { PathEditorScreen } from '@/features/learn/studio/PathEditor';

export default async function StudioPathEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PathEditorScreen id={id} />;
}
