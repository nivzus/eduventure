import { CourseScreen } from '@/features/learn/screens/CourseScreen';

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseScreen id={id} />;
}
