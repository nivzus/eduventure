import { RequireRole } from '@/lib/auth';
import { StudioQuizzes } from '@/features/quiz/components/studio/StudioQuizzes';

export const metadata = { title: 'Testlərim · Studiya' };

export default function StudioQuizzesPage() {
  return (
    <RequireRole roles={['TEACHER', 'ADMIN']}>
      <StudioQuizzes />
    </RequireRole>
  );
}
