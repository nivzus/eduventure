import { QuizOverview } from '@/features/quiz/components/overview/QuizOverview';

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizOverview id={id} />;
}
