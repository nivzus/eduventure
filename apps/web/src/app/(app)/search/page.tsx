import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchScreen } from '@/features/learn/screens/SearchScreen';

export const metadata: Metadata = { title: 'Axtarış' };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}
