/* Eduventure demo seed — idempotent-ish: wipes content tables, then recreates demo data. */
import { PrismaClient, Prisma, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

type Q = { type: QuestionType; text: string; options?: string[]; correct?: Prisma.InputJsonValue | null; explanation?: string; points?: number; tags?: string[] };

const QUIZZES: { title: string; description: string; category: string; tags: string[]; coverColor: string; timeLimitSec?: number; questions: Q[] }[] = [
  {
    title: 'Present Perfect vs Past Simple',
    description: 'Ən çox qarışdırılan iki zamanı fərqləndir.',
    category: 'Qrammatika',
    tags: ['tenses', 'present-perfect'],
    coverColor: '#FF8A1F',
    timeLimitSec: 600,
    questions: [
      { type: 'SINGLE', text: 'She ___ in Baku since 2019.', options: ['lives', 'has lived', 'lived', 'is living'], correct: { index: 1 }, explanation: '"since" + müddət → Present Perfect.', tags: ['present-perfect'] },
      { type: 'SINGLE', text: 'I ___ him yesterday.', options: ['have seen', 'saw', 'see', 'had see'], correct: { index: 1 }, explanation: '"yesterday" — bitmiş zaman → Past Simple.', tags: ['past-simple'] },
      { type: 'MULTIPLE', text: 'Hansı sözlər adətən Present Perfect ilə işlənir?', options: ['already', 'yesterday', 'yet', 'ever', 'last week'], correct: { indices: [0, 2, 3] }, tags: ['present-perfect'], points: 2 },
      { type: 'TRUE_FALSE', text: '"I have finished it two hours ago" cümləsi düzgündür.', correct: { value: false }, explanation: '"ago" ilə Past Simple işlənir: I finished it two hours ago.', tags: ['present-perfect'] },
      { type: 'TEXT', text: 'Past Simple of "go"?', correct: { answers: ['went'] }, tags: ['irregular-verbs'] },
      { type: 'FILL_BLANKS', text: 'I {{1}} (never / be) to London, but I {{2}} (visit) Paris last year.', correct: { blanks: [['have never been', "'ve never been"], ['visited']] }, tags: ['tenses'], points: 2 },
      { type: 'ORDERING', text: 'Sözləri düzgün sıraya qoy:', options: ['Have', 'you', 'ever', 'tried', 'sushi?'], correct: null, tags: ['word-order'] },
      { type: 'OPEN', text: 'Keçən həftə sonu nə etdiyini 2–3 cümlə ilə ingiliscə yaz.', correct: null, tags: ['writing'], points: 3 },
    ],
  },
  {
    title: 'Articles: a / an / the',
    description: 'Artikllərin istifadəsi üzrə sürətli test.',
    category: 'Qrammatika',
    tags: ['articles'],
    coverColor: '#9B7BFF',
    questions: [
      { type: 'SINGLE', text: "I saw ___ elephant at the zoo.", options: ['a', 'an', 'the', '—'], correct: { index: 1 }, tags: ['articles'] },
      { type: 'SINGLE', text: '___ sun rises in the east.', options: ['A', 'An', 'The', '—'], correct: { index: 2 }, explanation: 'Yeganə obyektlər "the" ilə.', tags: ['articles'] },
      { type: 'TRUE_FALSE', text: '"She is an university student" düzgündür.', correct: { value: false }, explanation: '"university" /juː/ səsi ilə başlayır → a university.', tags: ['articles'] },
      { type: 'FILL_BLANKS', text: 'He is {{1}} honest man and {{2}} best player in the team.', correct: { blanks: [['an'], ['the']] }, tags: ['articles'] },
    ],
  },
  {
    title: 'Everyday Vocabulary B1',
    description: 'Gündəlik həyat üçün vacib sözlər.',
    category: 'Lüğət',
    tags: ['vocabulary'],
    coverColor: '#7CE7FF',
    questions: [
      { type: 'SINGLE', text: '"Ətraf mühit" ingiliscə:', options: ['environment', 'equipment', 'entertainment', 'engagement'], correct: { index: 0 }, tags: ['vocabulary'] },
      { type: 'TEXT', text: '"Kitabxana" sözünü ingiliscə yaz.', correct: { answers: ['library'] }, tags: ['vocabulary'] },
      { type: 'MULTIPLE', text: 'Hansılar mətbəx əşyalarıdır?', options: ['kettle', 'pillow', 'frying pan', 'ladle', 'wardrobe'], correct: { indices: [0, 2, 3] }, tags: ['vocabulary'] },
      { type: 'SINGLE', text: '"Borrow" sözünün mənası:', options: ['borc vermək', 'borc almaq', 'satmaq', 'qaytarmaq'], correct: { index: 1 }, tags: ['vocabulary'] },
    ],
  },
];

const ARTICLE = `## Present Perfect nədir?

**Present Perfect** keçmişdə baş vermiş, amma nəticəsi indi də hiss olunan hərəkətləri bildirir.

> I *have lost* my keys. — Açarlarımı itirmişəm (indi də yoxdur).

### Quruluş

| Şəxs | Forma |
|---|---|
| I / you / we / they | have + V3 |
| he / she / it | has + V3 |

### Nə vaxt işlənir?
1. **Həyat təcrübəsi:** *Have you ever been to London?*
2. **Bu günə qədər davam edən hal:** *She has lived here since 2019.*
3. **Yeni baş vermiş hərəkət:** *I have just finished.*

### Past Simple ilə fərq
Əgər konkret keçmiş zaman göstərilirsə (*yesterday, last year, ago*) — **Past Simple** işlənir.

- ✅ I **saw** him yesterday.
- ❌ I **have seen** him yesterday.
`;

const CARDS: [string, string, string][] = [
  ['environment', 'ətraf mühit', 'We must protect the environment.'],
  ['achieve', 'nail olmaq', 'She achieved her goals.'],
  ['borrow', 'borc almaq', 'Can I borrow your pen?'],
  ['reliable', 'etibarlı', 'He is a reliable friend.'],
  ['improve', 'yaxşılaşdırmaq', 'I want to improve my English.'],
  ['although', 'baxmayaraq ki', 'Although it rained, we went out.'],
  ['schedule', 'cədvəl', 'What is your schedule today?'],
  ['suggest', 'təklif etmək', 'I suggest a short break.'],
  ['crowded', 'izdihamlı', 'The bus was crowded.'],
  ['afford', 'imkanı çatmaq', "I can't afford a new car."],
];

async function main() {
  // wipe (order matters for FKs; cascade handles most children)
  await prisma.$transaction([
    prisma.xpEvent.deleteMany(), prisma.userQuest.deleteMany(), prisma.quest.deleteMany(),
    prisma.userAchievement.deleteMany(), prisma.achievement.deleteMany(),
    prisma.notification.deleteMany(), prisma.comment.deleteMany(), prisma.bookmark.deleteMany(),
    prisma.assignment.deleteMany(), prisma.contentAccess.deleteMany(),
    prisma.attempt.deleteMany(), prisma.pathItem.deleteMany(), prisma.learningPath.deleteMany(),
    prisma.courseCompletion.deleteMany(), prisma.courseItem.deleteMany(), prisma.course.deleteMany(),
    prisma.flashcardReview.deleteMany(), prisma.flashcard.deleteMany(), prisma.flashcardDeck.deleteMany(),
    prisma.annotation.deleteMany(), prisma.articleProgress.deleteMany(), prisma.articleQuiz.deleteMany(), prisma.article.deleteMany(),
    prisma.question.deleteMany(), prisma.quiz.deleteMany(), prisma.bankQuestion.deleteMany(),
    prisma.groupMember.deleteMany(), prisma.group.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const admin = await prisma.user.create({ data: { email: 'admin@eduventure.az', name: 'Admin', role: 'ADMIN', passwordHash: hash('Admin123!') } });
  const seda = await prisma.user.create({ data: { email: 'seda@eduventure.az', name: 'Seda Müəllim', role: 'TEACHER', passwordHash: hash('Teacher123!'), bio: 'İngilis dili müəllimi' } });
  const names = ['Aysel Məmmədova', 'Rauf Əliyev', 'Nigar Həsənova', 'Tural Quliyev', 'Leyla İsmayılova', 'Elvin Kərimov', 'Günay Babayeva', 'Orxan Rzayev', 'Səbinə Nəbiyeva', 'Kamran Əhmədov'];
  const pw = hash('Student123!');
  const students = [];
  for (const [i, name] of names.entries()) {
    students.push(await prisma.user.create({ data: { email: `student${i + 1}@eduventure.az`, name, passwordHash: pw, lastActiveAt: daysAgo(i % 4) } }));
  }

  const quizzes = [];
  for (const q of QUIZZES) {
    quizzes.push(
      await prisma.quiz.create({
        data: {
          title: q.title, description: q.description, category: q.category, tags: q.tags, coverColor: q.coverColor,
          timeLimitSec: q.timeLimitSec, status: 'PUBLISHED', authorId: seda.id,
          questions: {
            create: q.questions.map((x, order) => ({
              order, type: x.type, text: x.text, options: x.options ?? [],
              correct: x.correct === null || x.correct === undefined ? Prisma.JsonNull : x.correct,
              explanation: x.explanation, points: x.points ?? 1, tags: x.tags ?? [],
            })),
          },
        },
        include: { questions: true },
      }),
    );
  }

  await prisma.bankQuestion.createMany({
    data: QUIZZES.flatMap((q) => q.questions.slice(0, 2)).map((x) => ({
      type: x.type, text: x.text, options: x.options ?? [], correct: x.correct ?? Prisma.JsonNull,
      explanation: x.explanation, points: x.points ?? 1, tags: x.tags ?? [], authorId: seda.id, difficulty: 2,
    })),
  });

  const article = await prisma.article.create({
    data: {
      title: 'Present Perfect: sadə izah', slug: 'present-perfect-sade-izah', excerpt: 'Nə vaxt "have + V3", nə vaxt Past Simple? Qısa və aydın.',
      content: ARTICLE, category: 'Qrammatika', tags: ['tenses', 'present-perfect'], readingMinutes: 4, status: 'PUBLISHED', authorId: seda.id,
      relatedQuizzes: { create: [{ quizId: quizzes[0].id }] },
    },
  });

  const deck = await prisma.flashcardDeck.create({
    data: {
      title: 'B1 — Gündəlik sözlər', description: '10 vacib söz nümunələrlə.', category: 'Lüğət', status: 'PUBLISHED', authorId: seda.id,
      cards: { create: CARDS.map(([front, back, example], order) => ({ order, front, back, example })) },
    },
  });

  const course = await prisma.course.create({
    data: {
      title: 'Zamanlar: A2 → B1', description: 'Present Perfect və Past Simple-ı mükəmməl öyrən.', category: 'Qrammatika', level: 'B1', status: 'PUBLISHED', authorId: seda.id,
      items: { create: [
        { order: 0, type: 'ARTICLE', articleId: article.id },
        { order: 1, type: 'QUIZ', quizId: quizzes[0].id },
        { order: 2, type: 'DECK', deckId: deck.id },
        { order: 3, type: 'QUIZ', quizId: quizzes[1].id },
      ] },
    },
  });
  await prisma.learningPath.create({
    data: { title: 'B1 səviyyəsinə yol', description: 'Qrammatika + lüğət marşrutu.', status: 'PUBLISHED', authorId: seda.id, items: { create: [{ order: 0, courseId: course.id }] } },
  });

  const group = await prisma.group.create({
    data: { name: 'B1 — Səhər qrupu', description: 'Bazar ertəsi / Çərşənbə / Cümə', color: '#FF8A1F', teacherId: seda.id, members: { create: students.slice(0, 6).map((s) => ({ userId: s.id })) } },
  });
  await prisma.assignment.create({ data: { contentType: 'QUIZ', contentId: quizzes[0].id, title: quizzes[0].title, groupId: group.id, dueAt: daysAgo(-5), assignedById: seda.id } });
  await prisma.assignment.create({ data: { contentType: 'COURSE', contentId: course.id, title: course.title, groupId: group.id, dueAt: daysAgo(-12), assignedById: seda.id } });

  await prisma.achievement.createMany({ data: [
    { code: 'first-quiz', title: 'İlk addım', description: 'İlk testini tamamla', icon: 'Footprints', xpReward: 10, rule: { type: 'QUIZZES', count: 1 } },
    { code: 'perfect', title: 'Mükəmməl zirvə', description: 'Testdən 100% topla', icon: 'Mountain', xpReward: 30, rule: { type: 'PERFECT', count: 1 } },
    { code: 'quiz-10', title: 'Yorulmaz səyyah', description: '10 test tamamla', icon: 'Compass', xpReward: 50, rule: { type: 'QUIZZES', count: 10 } },
    { code: 'reader', title: 'Kitab qurdu', description: '5 məqalə oxu', icon: 'BookOpen', xpReward: 25, rule: { type: 'ARTICLES', count: 5 } },
    { code: 'streak-7', title: 'Həftəlik od', description: '7 günlük seriya', icon: 'Flame', xpReward: 40, rule: { type: 'STREAK', count: 7 } },
    { code: 'cards-100', title: 'Kart ustası', description: '100 kart təkrarla', icon: 'Layers', xpReward: 40, rule: { type: 'CARDS', count: 100 } },
  ] });
  await prisma.quest.createMany({ data: [
    { title: 'Gündə 1 test', description: 'Bu gün bir test tamamla', type: 'COMPLETE_QUIZZES', target: 1, xpReward: 15, period: 'DAILY' },
    { title: '20 kart təkrarla', type: 'STUDY_CARDS', target: 20, xpReward: 20, period: 'DAILY' },
    { title: 'Həftədə 3 məqalə', type: 'READ_ARTICLES', target: 3, xpReward: 40, period: 'WEEKLY' },
    { title: '200 XP qazan', type: 'EARN_XP', target: 200, xpReward: 50, period: 'WEEKLY' },
  ] });

  // attempt history + XP so dashboards/leaderboards look alive
  for (const s of students) {
    let xp = 0;
    const n = 3 + Math.floor(Math.random() * 10);
    for (let k = 0; k < n; k++) {
      const quiz = pick(quizzes);
      const autoQs = quiz.questions.filter((q) => q.type !== 'OPEN');
      const maxScore = autoQs.reduce((a, q) => a + q.points, 0);
      const percent = Math.round(45 + Math.random() * 55);
      const score = Math.round((maxScore * percent) / 100);
      const when = daysAgo(Math.floor(Math.random() * 60));
      await prisma.attempt.create({
        data: {
          quizId: quiz.id, userId: s.id, mode: 'EXAM', status: 'GRADED', answers: {}, questionOrder: autoQs.map((q) => q.id),
          result: {}, score, maxScore, percent, passed: percent >= quiz.passPercent, timeSpentSec: 120 + Math.floor(Math.random() * 400),
          startedAt: when, submittedAt: when,
        },
      });
      const gained = Math.round(percent / 10) + 5;
      xp += gained;
      await prisma.xpEvent.create({ data: { userId: s.id, amount: gained, reason: 'QUIZ_SUBMITTED', createdAt: when } });
    }
    await prisma.user.update({ where: { id: s.id }, data: { xp, level: Math.floor(Math.sqrt(xp / 100)) + 1, streak: Math.floor(Math.random() * 9) } });
  }

  console.log(`Seeded: ${students.length} students, ${quizzes.length} quizzes, admin=${admin.email}, teacher=${seda.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
