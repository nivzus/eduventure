import { CourseEditorScreen } from '@/features/learn/studio/CourseEditor';

export default async function StudioCourseEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CourseEditorScreen id={id} />;
}
