import { PublicProfileScreen } from '@/features/community/screens/PublicProfileScreen';

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicProfileScreen id={id} />;
}
