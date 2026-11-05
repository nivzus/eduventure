/* Achievements and quests shared by the demo seed and the production seed. */
import type { Prisma } from '@prisma/client';

export const ACHIEVEMENTS: Prisma.AchievementCreateInput[] = [
  { code: 'first-quiz', title: 'İlk addım', description: 'İlk testini tamamla', icon: 'Footprints', xpReward: 10, rule: { type: 'quizzes', count: 1 } },
  { code: 'perfect', title: 'Mükəmməl zirvə', description: 'Testdən 100% topla', icon: 'Mountain', xpReward: 30, rule: { type: 'perfect', count: 1 } },
  { code: 'quiz-10', title: 'Yorulmaz səyyah', description: '10 test tamamla', icon: 'Compass', xpReward: 50, rule: { type: 'quizzes', count: 10 } },
  { code: 'reader', title: 'Kitab qurdu', description: '5 məqalə oxu', icon: 'BookOpen', xpReward: 25, rule: { type: 'articles', count: 5 } },
  { code: 'streak-7', title: 'Həftəlik od', description: '7 günlük seriya', icon: 'Flame', xpReward: 40, rule: { type: 'streak', days: 7 } },
  { code: 'cards-100', title: 'Kart ustası', description: '100 kart təkrarla', icon: 'Layers', xpReward: 40, rule: { type: 'cards', count: 100 } },
];

export const QUESTS: Prisma.QuestCreateInput[] = [
  { title: 'Gündə 1 test', description: 'Bu gün bir test tamamla', type: 'COMPLETE_QUIZZES', target: 1, xpReward: 15, period: 'DAILY' },
  { title: '20 kart təkrarla', type: 'STUDY_CARDS', target: 20, xpReward: 20, period: 'DAILY' },
  { title: 'Həftədə 3 məqalə', type: 'READ_ARTICLES', target: 3, xpReward: 40, period: 'WEEKLY' },
  { title: '200 XP qazan', type: 'EARN_XP', target: 200, xpReward: 50, period: 'WEEKLY' },
];
