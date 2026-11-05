import { RequireRole } from '@/lib/auth';
import { QuizEditor } from '@/features/quiz/components/studio/QuizEditor';

export const metadata = { title: 'Test redaktoru · Studiya' };

export default async function StudioQuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireRole roles={['TEACHER', 'ADMIN']}>
      <QuizEditor key={id === 'new' ? 'new' : 'edit'} id={id} />
    </RequireRole>
  );
}
