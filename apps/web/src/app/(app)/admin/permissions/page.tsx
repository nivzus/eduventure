import type { Metadata } from 'next';
import { PermissionsScreen } from '@/features/admin/screens/PermissionsScreen';

export const metadata: Metadata = { title: 'İcazələr' };

export default function Page() {
  return <PermissionsScreen />;
}
