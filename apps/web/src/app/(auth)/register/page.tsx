import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '../AuthForm';

export const metadata: Metadata = { title: 'Qeydiyyat' };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
