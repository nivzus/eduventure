import {
  Award,
  BookOpen,
  Brain,
  CalendarCheck,
  CircleCheck,
  Compass,
  Crown,
  Flag,
  Flame,
  Footprints,
  Gem,
  GraduationCap,
  Heart,
  Layers,
  ListChecks,
  Map,
  Medal,
  Moon,
  Mountain,
  MountainSnow,
  PenLine,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Sunrise,
  Target,
  Tent,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Curated lucide set for achievements (kebab-case keys, as stored in `Achievement.icon`). */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  medal: Medal,
  award: Award,
  crown: Crown,
  star: Star,
  sparkles: Sparkles,
  flame: Flame,
  zap: Zap,
  target: Target,
  rocket: Rocket,
  mountain: Mountain,
  'mountain-snow': MountainSnow,
  flag: Flag,
  compass: Compass,
  map: Map,
  tent: Tent,
  footprints: Footprints,
  'book-open': BookOpen,
  brain: Brain,
  layers: Layers,
  'list-checks': ListChecks,
  'graduation-cap': GraduationCap,
  'pen-line': PenLine,
  gem: Gem,
  shield: Shield,
  heart: Heart,
  sunrise: Sunrise,
  moon: Moon,
  timer: Timer,
  'calendar-check': CalendarCheck,
  'circle-check': CircleCheck,
};

export const ACHIEVEMENT_ICON_NAMES = Object.keys(ACHIEVEMENT_ICONS);

function toKebab(name: string): string {
  return name
    .trim()
    .replace(/Icon$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

const ALIASES: Record<string, string> = {
  'check-circle': 'circle-check',
  'check-circle-2': 'circle-check',
  fire: 'flame',
  bolt: 'zap',
  lightning: 'zap',
  book: 'book-open',
  cap: 'graduation-cap',
  'calendar-check-2': 'calendar-check',
};

export function achievementIcon(name?: string | null): LucideIcon {
  if (!name) return Trophy;
  const k = toKebab(name);
  return ACHIEVEMENT_ICONS[k] ?? ACHIEVEMENT_ICONS[ALIASES[k] ?? ''] ?? Trophy;
}
