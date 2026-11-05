import {
  BarChart3,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Database,
  FileQuestion,
  GraduationCap,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  PenTool,
  Route,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  User,
  Users,
  UsersRound,
  Bell,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** extra keywords for ⌘K */
  keywords?: string;
  /** match nested routes (default true) */
  exact?: boolean;
}
export interface NavGroup {
  id: string;
  label: string;
  roles?: Role[];
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    id: 'home',
    label: 'Baza',
    items: [{ href: '/dashboard', label: 'İdarə paneli', icon: LayoutDashboard, keywords: 'dashboard panel ana səhifə home' }],
  },
  {
    id: 'learn',
    label: 'Öyrən',
    items: [
      { href: '/articles', label: 'Məqalələr', icon: BookOpen, keywords: 'articles oxu read' },
      { href: '/courses', label: 'Kurslar', icon: GraduationCap, keywords: 'courses kurs' },
      { href: '/paths', label: 'Öyrənmə yolları', icon: Route, keywords: 'paths yol' },
      { href: '/decks', label: 'Kartlar', icon: Layers, keywords: 'flashcards decks söz lüğət' },
    ],
  },
  {
    id: 'practice',
    label: 'Məşq',
    items: [
      { href: '/quizzes', label: 'Testlər', icon: ListChecks, keywords: 'quiz test imtahan' },
      { href: '/practice', label: 'Ağıllı məşq', icon: Target, keywords: 'practice zəif mövzular smart' },
      { href: '/assignments', label: 'Tapşırıqlar', icon: ClipboardList, keywords: 'assignments ev tapşırığı' },
      { href: '/bookmarks', label: 'Seçilmişlər', icon: BookMarked, keywords: 'bookmarks saxlanılan' },
    ],
  },
  {
    id: 'community',
    label: 'İcma',
    items: [
      { href: '/leaderboard', label: 'Liderlər', icon: Trophy, keywords: 'leaderboard reytinq xp' },
      { href: '/groups', label: 'Qruplar', icon: Users, keywords: 'groups sinif' },
      { href: '/notifications', label: 'Bildirişlər', icon: Bell, keywords: 'notifications' },
      { href: '/profile', label: 'Profil', icon: User, keywords: 'profile hesab nailiyyətlər' },
    ],
  },
  {
    id: 'studio',
    label: 'Studio',
    roles: ['TEACHER', 'ADMIN'],
    items: [
      { href: '/studio', label: 'Studio', icon: PenTool, exact: true, keywords: 'studio müəllim' },
      { href: '/studio/quizzes', label: 'Test redaktoru', icon: FileQuestion, keywords: 'quiz editor yarat' },
      { href: '/studio/bank', label: 'Sual bankı', icon: Database, keywords: 'bank suallar' },
      { href: '/studio/review', label: 'Yoxlama', icon: ClipboardCheck, keywords: 'review manual qiymətləndirmə' },
      { href: '/studio/articles', label: 'Məqalələr', icon: NotebookPen, keywords: 'article editor' },
      { href: '/studio/courses', label: 'Kurslar', icon: GraduationCap, keywords: 'course editor' },
      { href: '/studio/paths', label: 'Yollar', icon: Route, keywords: 'path editor' },
      { href: '/studio/decks', label: 'Kart dəstləri', icon: Layers, keywords: 'deck editor' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    roles: ['ADMIN'],
    items: [
      { href: '/admin', label: 'Admin paneli', icon: Shield, exact: true, keywords: 'admin' },
      { href: '/admin/users', label: 'İstifadəçilər', icon: UsersRound, keywords: 'users rollar' },
      { href: '/admin/analytics', label: 'Analitika', icon: BarChart3, keywords: 'analytics statistika' },
      { href: '/admin/groups', label: 'Qruplar', icon: Users, keywords: 'groups' },
      { href: '/admin/quests', label: 'Kvestlər', icon: Swords, keywords: 'quests achievements nailiyyət' },
      { href: '/admin/permissions', label: 'İcazələr', icon: KeyRound, keywords: 'permissions visibility görünürlük' },
    ],
  },
];

export const MOBILE_TABS: NavItem[] = [
  { href: '/dashboard', label: 'Panel', icon: Compass },
  { href: '/quizzes', label: 'Testlər', icon: ListChecks },
  { href: '/articles', label: 'Öyrən', icon: BookOpen },
  { href: '/leaderboard', label: 'Liderlər', icon: Trophy },
];

export const PRACTICE_SHORTCUT: NavItem = { href: '/practice', label: 'Ağıllı məşq', icon: Sparkles };

export function navForRole(role?: Role | null) {
  return NAV.filter((g) => !g.roles || (role && g.roles.includes(role)));
}

export function isActive(pathname: string, item: Pick<NavItem, 'href' | 'exact'>) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

/** best (longest) matching nav href for current path */
export function activeHref(pathname: string, items: NavItem[]) {
  let best: string | null = null;
  for (const it of items) {
    if (isActive(pathname, it) && (!best || it.href.length > best.length)) best = it.href;
  }
  return best;
}
