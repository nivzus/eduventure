import { RequireRole } from '@/lib/auth';
import { ReviewList } from '@/features/quiz/components/studio/ReviewScreens';

export const metadata = { title: 'Yoxlama · Studiya' };

export default function StudioReviewPage() {
  return (
    <RequireRole roles={['TEACHER', 'ADMIN']}>
      <ReviewList />
    </RequireRole>
  );
}
