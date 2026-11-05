import type { Metadata } from 'next';
import { UsersScreen } from '@/features/admin/screens/UsersScreen';

export const metadata: Metadata = { title: 'İstifadəçilər' };

export default function Page() {
  return <UsersScreen />;
}
