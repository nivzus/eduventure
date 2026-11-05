import type { Metadata } from 'next';
import { QuestsScreen } from '@/features/admin/screens/QuestsScreen';

export const metadata: Metadata = { title: 'Kvestlər' };

export default function Page() {
  return <QuestsScreen />;
}
