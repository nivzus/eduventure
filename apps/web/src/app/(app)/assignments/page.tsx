import type { Metadata } from 'next';
import { AssignmentsScreen } from '@/features/community/screens/AssignmentsScreen';

export const metadata: Metadata = { title: 'Tapşırıqlarım' };

export default function AssignmentsPage() {
  return <AssignmentsScreen />;
}
