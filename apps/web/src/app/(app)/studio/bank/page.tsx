import { RequireRole } from '@/lib/auth';
import { BankScreen } from '@/features/quiz/components/studio/BankScreen';

export const metadata = { title: 'Sual bankı · Studiya' };

export default function StudioBankPage() {
  return (
    <RequireRole roles={['TEACHER', 'ADMIN']}>
      <BankScreen />
    </RequireRole>
  );
}
