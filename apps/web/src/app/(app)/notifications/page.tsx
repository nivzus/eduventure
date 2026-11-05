import type { Metadata } from 'next';
import { NotificationsScreen } from '@/features/community/screens/NotificationsScreen';

export const metadata: Metadata = { title: 'Bildirişlər' };

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
