import type { Metadata } from 'next';
import { QuestsScreen } from '@/features/admin/screens/QuestsScreen';

export const metadata: Metadata = { title: 'Nailiyyətlər' };

export default function Page() {
  return <QuestsScreen initialTab="achievements" />;
}
