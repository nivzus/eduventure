'use client';

import { BookMarked, ClipboardList, LogOut, PenTool, Shield, User, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, isAdmin, isStaff } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Menu } from '@/components/ui/Menu';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <Menu
      align="end"
      trigger={
        <button type="button" aria-label="Hesab menyusu" className="rounded-full transition hover:opacity-90 active:scale-95">
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        </button>
      }
      header={
        <div className="flex items-center gap-3 py-1">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <Badge tone={user.role === 'ADMIN' ? 'ember' : user.role === 'TEACHER' ? 'aurora' : 'neutral'} mono className="mt-1.5">
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
        </div>
      }
      items={[
        { label: 'Profil', icon: User, href: '/profile' },
        { label: 'Seçilmişlər', icon: BookMarked, href: '/bookmarks' },
        { label: 'Tapşırıqlar', icon: ClipboardList, href: '/assignments' },
        { label: 'Bildirişlər', icon: Bell, href: '/notifications' },
        isStaff(user) && { separator: true },
        isStaff(user) && { label: 'Studio', icon: PenTool, href: '/studio' },
        isAdmin(user) && { label: 'Admin paneli', icon: Shield, href: '/admin' },
        { separator: true },
        {
          label: 'Çıxış',
          icon: LogOut,
          danger: true,
          onClick: async () => {
            await logout();
            router.push('/login');
          },
        },
      ]}
    />
  );
}
