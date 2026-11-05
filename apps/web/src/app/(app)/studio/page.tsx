import { RequireRole } from '@/lib/auth';
import { StudioHome } from '@/features/quiz/components/studio/StudioHome';

export const metadata = { title: 'Studiya' };

export default function StudioPage() {
  return (
    <RequireRole roles={['TEACHER', 'ADMIN']}>
      <StudioHome />
    </RequireRole>
  );
}
