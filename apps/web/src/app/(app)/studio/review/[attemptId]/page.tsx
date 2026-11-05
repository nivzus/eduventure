import { RequireRole } from '@/lib/auth';
import { ReviewDetail } from '@/features/quiz/components/studio/ReviewScreens';

export const metadata = { title: 'Cavabı yoxla · Studiya' };

export default async function StudioReviewDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return (
    <RequireRole roles={['TEACHER', 'ADMIN']}>
      <ReviewDetail attemptId={attemptId} />
    </RequireRole>
  );
}
