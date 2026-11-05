import type { Metadata } from 'next';
import { LeaderboardScreen } from '@/features/community/screens/LeaderboardScreen';

export const metadata: Metadata = { title: 'Reytinq' };

export default function LeaderboardPage() {
  return <LeaderboardScreen />;
}
