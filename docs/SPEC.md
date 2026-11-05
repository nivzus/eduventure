# Eduventure 2.0 — Shared Spec (single source of truth for all agents)

Old project (CRA + Supabase) lives in `legacy/` — read it to understand features (main logic in `legacy/src/App.js`, pages in `legacy/src/pages/*`). UI language: **Azerbaijani** (same copy tone as legacy; ə, ğ, ı, ö, ü, ş, ç must render). Brand: **Eduventure** ("İngilis dilini birlikdə öyrənək" — English-learning platform by teacher **Sədaqət Ağayeva** ("Seda"). **Brand mascot = the orange cat** (legacy `WavingCat.js`): the logo features the cat; `Mascot`/`MascotPeek` from `@/components/brand` appear in empty states, results (celebrate/sad), onboarding and peek in from the bottom-right with Azerbaijani motivational bubbles.

Monorepo:
```
apps/api   NestJS 11 + Prisma 6 + PostgreSQL 16   (port 4000, global prefix /api)
apps/web   Next.js 15 App Router + TS + Tailwind v4 + motion (framer)  (port 3000)
docker-compose.yml  (postgres)
```
Next rewrites `/api/:path*` → `http://localhost:4000/api/:path*` (env `API_URL`), so the browser is same-origin and auth cookies just work.

**Git: agents must NOT run git add/commit/push/checkout.** The lead commits.

---
## 1. Design concept — "Night Expedition"

Learning = an expedition. Topographic contour lines, trails with waypoints, altitude = XP, summit flag = completion. Editorial typography + bold signal color on deep ink. Not a generic SaaS dashboard: asymmetric bento grids, oversized display type, mono meta-labels, generous negative space, tactile micro-motion.

**Owner decision: the brand stays ORANGE.** Primary `--signal` = cat orange (#FF8A1F dark / #F57C1F light), `--ember` = second orange shade (amber #FFB547 dark / burnt #C2410C light). Old lime values below are superseded.

### Tokens (CSS variables in `apps/web/src/app/globals.css`, Tailwind v4 `@theme`)
Dark (default, `data-theme="dark"` on `<html>`):
- `--bg` #0B0B10 (ink) · `--bg-elev` #13131B · `--bg-sunken` #08080C · `--surface` #191923 · `--border` rgba(255,255,255,.08) · `--border-strong` rgba(255,255,255,.16)
- `--fg` #F4F1EA (paper) · `--fg-muted` #A09DAA · `--fg-subtle` #6B6878
- `--signal` #E8FF59 (headlamp lime — primary CTA, focus, progress) · `--signal-fg` #0B0B10
- `--ember` #FF6B3D (energy/streak/hot, continuity with old orange brand)
- `--glacier` #7CE7FF (info) · `--aurora` #9B7BFF (XP/levels/achievements) · `--moss` #4ADE80 (correct) · `--danger` #FF4D6D (wrong/destructive)
Light ("paper map", `data-theme="light"`): bg #F3EEE3, bg-elev #FBF8F1, surface #FFFFFF, fg #14131A, fg-muted #5D5A66, signal #1A1A22 with signal-fg #E8FF59 (inverted chip), ember #E8542A, aurora #6B4BFF, glacier #0A8FB5, moss #15803D, danger #D7263D.
Tailwind utilities map to tokens: `bg-bg`, `bg-elev`, `bg-surface`, `text-fg`, `text-muted`, `text-subtle`, `border-line`, `bg-signal text-signal-fg`, `text-ember`, `text-aurora`, `text-glacier`, `text-moss`, `text-danger`.
Radius: cards 24px (`rounded-3xl`), controls 14px (`rounded-2xl`), chips full. Shadows minimal; depth via borders + inner glow + noise grain overlay (fixed, 4% opacity).

### Type
- Display: **Unbounded Variable** (`font-display`) — headings, big numbers, tight tracking (-0.02em), weights 500–800.
- Body: **Manrope Variable** (`font-sans`).
- Accent: **Instrument Serif** italic (`font-serif`) — single emphasized words in headlines ("Öyrən *macəra* ilə").
- Mono: **JetBrains Mono Variable** (`font-mono`) — meta labels, uppercase, `text-[11px] tracking-[0.14em]`, stats, timers, kbd.
Load via `@fontsource-variable/*` + `@fontsource/instrument-serif` (no network at build).

### Motion language (package `motion`, import from `motion/react`)
- Ease out-expo `[0.22, 1, 0.36, 1]`; durations 0.25 (micro) / 0.5 (enter) / 0.8 (hero). Springs: `{type:'spring', stiffness: 380, damping: 30}` for UI, `{stiffness: 120, damping: 20}` for playful.
- Enter: fade + y 16 + blur(6px)→0, staggered 0.05. Exit faster than enter.
- Signature motions: animated topographic contour background (slow drift SVG), trail-draw (`pathLength` 0→1) for paths/progress, NumberTicker counters, XP "altimeter" bar fill, summit-flag + confetti on pass, 3D card flip for flashcards, `layoutId` highlight for selected options/tabs/nav, `Reorder` drag for ordering questions, magnetic primary buttons, cursor spotlight on interactive cards, ⌘K command palette spring-in, page transitions (fade/blur).
- Press: `whileTap={{scale: .97}}`. Hover lifts are 2px max. Always respect `useReducedMotion()`.

### App shell (owned by WEB-FOUNDATION)
- Desktop: left rail (72px collapsed / 248px expanded) with icon+label nav groups (Öyrən, Məşq, İcma, Studio [teacher/admin], Admin [admin]); top bar: ⌘K search trigger, streak flame, XP/level chip, notifications popover, theme toggle, avatar menu.
- Mobile: top bar + bottom tab bar (5 items) + sheet for more.
- Focus layout (no shell) for taking quizzes: `(focus)` route group.

### UI kit — `@/components/ui` (barrel `index.ts`) — exact export names
`Button` (variant: `primary|secondary|ghost|outline|danger`, size: `sm|md|lg`, `loading`, `leftIcon`, `rightIcon`, `magnetic`, plus native props; also `asChild`-less `ButtonLink` with `href`), `IconButton` (`label` required for a11y), `Card` (props `interactive` → spotlight + lift, `padded`), `Badge` (tone: `neutral|signal|ember|aurora|glacier|moss|danger`), `Input`, `Textarea`, `Select` (native, styled), `Checkbox`, `Switch`, `Label`, `Field` (label + hint + error wrapper), `Tabs` ({tabs:[{value,label}], value, onChange} with layoutId underline), `Segmented` (same API, pill), `Modal` ({open, onClose, title, description, children, footer, size}), `Drawer`, `Tooltip`, `Avatar` ({name, src, size}), `Progress` ({value, max, tone}), `ProgressRing` ({value, size, stroke, tone}), `Skeleton`, `EmptyState` ({icon, title, description, action}), `PageHeader` ({eyebrow, title, description, actions}), `StatTile` ({label, value, delta, icon, tone}), `Kbd`, `Menu` ({trigger, items:[{label, icon, onClick, href, danger}]}), `Spinner`, `Table` (simple styled table primitives: `Table, THead, TBody, TR, TH, TD`).
Toasts: `import { toast } from '@/components/ui/toast'` → `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)` (Toaster mounted in root layout).
Motion — `@/components/motion`: `Reveal` (in-view fade-up), `Stagger` + `StaggerItem`, `NumberTicker` ({value}), `Magnetic`, `Spotlight`, `TopoBackground`, `TrailPath`, `PageTransition`, `Marquee`, `fireConfetti()`.
Icons: `lucide-react`. Utils: `cn()` from `@/lib/utils` (clsx + tailwind-merge). Charts: hand-made SVG with motion, or `recharts` if needed (themed via tokens).

### Data layer (owned by WEB-FOUNDATION)
- `@/lib/api`: `api.get<T>(path, params?)`, `api.post<T>(path, body?)`, `api.patch<T>`, `api.put<T>`, `api.del<T>`, `api.upload<T>(path, FormData)`; base `/api`, `credentials: 'include'`, auto `POST /api/auth/refresh` once on 401 then retry; throws `ApiError {status, message}`.
- TanStack Query v5 provider in root; feature hooks live in each feature folder (e.g. `src/features/quiz/hooks.ts`) using `useQuery/useMutation`.
- `@/lib/auth`: `useAuth()` → `{ user, isLoading, login(email,pw), register(name,email,pw), logout(), refetch() }`; `<RequireRole roles={['ADMIN']}>`.
- `@/lib/types`: all domain types mirroring §2 (exported TS interfaces with same names/fields).

### Route map (Next app router; all agents must link to these exact paths)
Public: `/` landing · `/login` · `/register`
App (shell, `(app)` group): `/dashboard` · `/quizzes` · `/quizzes/[id]` (overview + start: mode select, passcode) · `/practice` (smart practice from weak topics) · `/attempts/[id]/result` · `/attempts/[id]/review` · `/articles` · `/articles/[slug]` · `/courses` · `/courses/[id]` · `/paths` · `/paths/[id]` · `/decks` · `/decks/[id]` · `/bookmarks` · `/search?q=` · `/profile` · `/u/[id]` · `/leaderboard` · `/assignments` · `/groups` · `/groups/[id]` · `/notifications`
Focus (no shell, `(focus)` group): `/attempts/[id]` (taking a quiz) · `/decks/[id]/study`
Studio (TEACHER|ADMIN): `/studio` · `/studio/quizzes` · `/studio/quizzes/[id]` (`new` allowed) · `/studio/bank` · `/studio/review` · `/studio/review/[attemptId]` · `/studio/articles` · `/studio/articles/[id]` · `/studio/courses` · `/studio/courses/[id]` · `/studio/paths` · `/studio/paths/[id]` · `/studio/decks` · `/studio/decks/[id]`
Admin (ADMIN): `/admin` · `/admin/users` · `/admin/analytics` · `/admin/analytics/quizzes/[id]` · `/admin/groups` · `/admin/groups/[id]` · `/admin/quests` · `/admin/permissions`

### Frontend ownership (do not edit other agents' folders; if you need something, create it in yours)
- WEB-FOUNDATION: scaffold, `next.config.ts`, `globals.css`, root layout, providers, `src/components/ui/**`, `src/components/motion/**`, `src/components/shell/**`, `src/lib/**`, `(marketing)` landing, `(auth)` login/register, `(app)/layout.tsx`, `(focus)/layout.tsx`.
- WEB-QUIZ: `src/features/quiz/**`, routes `/quizzes*`, `/practice`, `/attempts/**`, `/studio/quizzes*`, `/studio/bank`, `/studio/review*`.
- WEB-LEARN: `src/features/learn/**`, routes `/articles*`, `/courses*`, `/paths*`, `/decks*`, `/bookmarks`, `/search`, `/studio/articles*`, `/studio/courses*`, `/studio/paths*`, `/studio/decks*`.
- WEB-COMMUNITY: `src/features/community/**`, `src/features/admin/**`, routes `/dashboard`, `/profile`, `/u/*`, `/leaderboard`, `/assignments`, `/groups*`, `/notifications`, `/studio` (studio home), `/admin/**`.
WEB-FOUNDATION creates `apps/web/.foundation-ready` once ui kit + motion + lib + app layouts compile. Others: study legacy + plan while waiting, then build.

---
## 2. Domain model (Prisma, `apps/api/prisma/schema.prisma`) — ids are `cuid()` strings, timestamps `createdAt/updatedAt`

Enums: `Role {STUDENT TEACHER ADMIN}` · `ContentStatus {DRAFT PUBLISHED ARCHIVED}` · `Visibility {PUBLIC PRIVATE GROUPS PASSCODE}` · `QuestionType {SINGLE MULTIPLE TEXT TRUE_FALSE ORDERING FILL_BLANKS OPEN}` · `AttemptMode {EXAM PRACTICE}` · `AttemptStatus {IN_PROGRESS SUBMITTED PENDING_REVIEW GRADED}` · `ContentType {QUIZ ARTICLE COURSE PATH DECK}` · `CommentTarget {ARTICLE ATTEMPT GROUP COURSE}` · `CourseItemType {ARTICLE QUIZ DECK}` · `QuestType {COMPLETE_QUIZZES READ_ARTICLES STUDY_CARDS PERFECT_SCORE EARN_XP}` · `QuestPeriod {DAILY WEEKLY ONCE}`

Models (fields; relations implied):
- **User**: id, email (unique), passwordHash, name, avatarUrl?, bio?, role (default STUDENT), xp Int 0, level Int 1, streak Int 0, lastActiveAt?, tokenVersion Int 0.
- **Quiz**: id, title, description?, category?, tags String[], coverColor?, status, visibility (PUBLIC), passcode?, timeLimitSec Int?, passPercent Int 60, shuffleQuestions Bool, shuffleOptions Bool, showAnswers Bool true, maxAttempts Int?, authorId, questions Question[].
- **Question**: id, quizId, order Int, type, text, imageUrl?, options Json (string[]; for ORDERING = items in correct order; FILL_BLANKS text uses `{{1}}`,`{{2}}` placeholders inside `text`), correct Json, explanation?, points Int 1, tags String[].
  `correct` shapes: SINGLE `{index:number}` · MULTIPLE `{indices:number[]}` · TEXT `{answers:string[]}` (accepted variants, case/space-insensitive) · TRUE_FALSE `{value:boolean}` · ORDERING `null` (options already in correct order) · FILL_BLANKS `{blanks:string[][]}` (accepted variants per blank) · OPEN `null` (manual review).
  User answer shapes: SINGLE number · MULTIPLE number[] · TEXT string · TRUE_FALSE boolean · ORDERING string[] (items) · FILL_BLANKS string[] · OPEN string.
- **BankQuestion**: same as Question minus quizId/order, plus authorId, difficulty Int 1-3.
- **Attempt**: id, quizId, userId, mode, status, answers Json ({[questionId]: answer}), questionOrder String[], result Json? ({[questionId]: {correct:boolean|null, points:number, max:number}}), score Float, maxScore Float, percent Float, passed Bool, timeSpentSec Int, feedback?, startedAt, submittedAt?.
- **Article**: id, title, slug (unique), excerpt?, content (markdown), coverUrl?, category?, tags String[], readingMinutes Int, status, visibility, passcode?, authorId, relatedQuizzes (m-n Quiz via ArticleQuiz).
- **ArticleProgress**: userId+articleId unique, progress Int 0-100, completedAt?.
- **Annotation**: id, userId, articleId, quote, note?, color (signal|ember|aurora|glacier), startOffset Int, endOffset Int.
- **Course**: id, title, description?, coverUrl?, category?, level?, status, visibility, passcode?, authorId, items CourseItem[]. **CourseItem**: id, courseId, order, type, articleId?, quizId?, deckId?.
- **CourseCompletion**: userId+courseId unique, completedAt.
- **LearningPath**: id, title, description?, coverUrl?, status, visibility, authorId, items PathItem[]. **PathItem**: id, pathId, order, courseId.
- **FlashcardDeck**: id, title, description?, category?, status, visibility, authorId, cards Flashcard[]. **Flashcard**: id, deckId, order, front, back, example?. **FlashcardReview** (SM-2): userId+cardId unique, ease Float 2.5, interval Int 0, repetitions Int 0, dueAt, lastGrade Int?.
- **Group**: id, name, description?, color?, teacherId, members GroupMember[]. **GroupMember**: groupId+userId unique, joinedAt.
- **ContentAccess**: contentType, contentId, groupId (for visibility=GROUPS).
- **Assignment**: id, contentType, contentId, title (denormalized), groupId?, userId?, dueAt?, assignedById.
- **Notification**: id, userId, type (string), title, body?, link?, readAt?.
- **Comment**: id, userId, targetType, targetId, parentId?, body.
- **Bookmark**: userId+contentType+contentId unique.
- **Achievement**: id, code (unique), title, description, icon (lucide name), xpReward, rule Json. **UserAchievement**: userId+achievementId unique, unlockedAt.
- **Quest**: id, title, description?, type, target Int, xpReward, period, active Bool. **UserQuest**: userId+questId+periodKey unique, progress Int, completedAt?, claimedAt?.
- **XpEvent**: id, userId, amount, reason, createdAt (leaderboards by period).

XP rules: quiz submit = round(percent/10)+5 (exam), practice = 3; perfect = +20; article complete = 10; course complete = 50; flashcard review = 1/card. level = floor(sqrt(xp/100))+1. Streak: consecutive days with activity.

---
## 3. REST contract (prefix `/api`; JSON camelCase; lists return plain arrays unless noted; errors = Nest default `{statusCode, message}`)
Auth via httpOnly cookies `access_token` (15m JWT) + `refresh_token` (30d JWT, tokenVersion); also accepts `Authorization: Bearer`.
Students never receive `correct` fields of quiz questions before submit.

**Auth**: `POST /auth/register {name,email,password}` → User · `POST /auth/login {email,password}` → User · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` → User
**Me/Users**: `PATCH /me {name,bio,avatarUrl}` · `PATCH /me/password {current,next}` · `GET /me/summary` → `{xp, level, levelProgress(0-1), nextLevelXp, streak, rank, quizzesTaken, avgPercent, articlesRead, coursesCompleted, cardsDue, recentAttempts: Attempt&{quiz:{id,title}}[], weakTopics:{tag,accuracy,total}[], activity:{date,count}[] (last 120 days)}` · `GET /users?q&role` (TEACHER/ADMIN) · `GET /users/:id` (public profile: user + achievements + stats) · `PATCH /users/:id/role {role}` (ADMIN) · `DELETE /users/:id` (ADMIN)
**Quizzes**: `GET /quizzes?q&category&tag&status&mine=1` → `(Quiz & {questionCount, author:{id,name}, myBest?:number, attemptsCount})[]` · `GET /quizzes/categories` → string[] · `GET /quizzes/:id` → Quiz & {questions (sanitized for students), author} · `POST /quizzes` · `PATCH /quizzes/:id` (body may include full `questions` array → replaces) · `DELETE /quizzes/:id` · `POST /quizzes/:id/clone` · `POST /quizzes/:id/import` (multipart `file` CSV: text,type,options(|-separated),correctAnswers(|-separated),explanation,points)
**Attempts**: `POST /quizzes/:id/attempts {mode, passcode?}` → `{attempt, quiz:{id,title,timeLimitSec,showAnswers,mode}, questions: SanitizedQuestion[]}` · `GET /attempts/:id` → attempt + quiz + questions (with `correct` & explanation only after submit and showAnswers, or always for PRACTICE checks) · `POST /attempts/:id/check {questionId, answer}` (PRACTICE only) → `{correct, correctAnswer, explanation}` · `PATCH /attempts/:id/answers {answers}` (autosave) · `POST /attempts/:id/submit {answers, timeSpentSec}` → graded Attempt + `{xpGained, newAchievements: Achievement[], levelUp:boolean}` · `GET /attempts?mine=1|quizId|userId` · `GET /attempts/pending-review` (TEACHER/ADMIN) · `POST /attempts/:id/grade {points:{[questionId]:number}, feedback?}`
**Practice**: `GET /practice/weak-topics` → `{tag,accuracy,total}[]` · `POST /practice/smart {tags?:string[], count?:number}` → same shape as start attempt (virtual practice quiz built from previously-missed questions)
**Bank**: `GET /bank?q&tag&type` · `GET /bank/tags` · `POST /bank` · `PATCH /bank/:id` · `DELETE /bank/:id` · `POST /bank/import` (CSV) · `POST /bank/to-quiz {questionIds, quizId}` · `POST /ai/generate-questions {topic, count, type?, level?}` → BankQuestion-like drafts (Gemini via `GEMINI_API_KEY`; deterministic mock if unset)
**Stats** (TEACHER/ADMIN): `GET /stats/overview` → `{users, activeUsers7d, quizzes, attempts, avgPercent, attemptsByDay:{date,count}[], topQuizzes, recentAttempts}` · `GET /stats/quizzes/:id` → `{quiz, attempts, avgPercent, passRate, avgTimeSec, distribution:{bucket,count}[], questions:{id,text,type,correctRate,avgPoints}[], byUser}` · `GET /stats/students/:id` · `GET /stats/groups/:id`
**Gamification**: `GET /leaderboard?period=week|month|all&groupId` → `{rank,user:{id,name,avatarUrl,level},xp}[]` · `GET /achievements` (all + `unlockedAt` for me) · `GET /quests` (active + my progress) · `POST /quests/:id/claim` · Admin: `GET/POST/PATCH/DELETE /admin/quests`, `GET/POST/PATCH/DELETE /admin/achievements`
**Articles**: `GET /articles?q&category&tag` (+ `myProgress`) · `GET /articles/:slugOrId` · `POST/PATCH/DELETE /articles(/:id)` · `PUT /articles/:id/progress {progress}` · `GET /articles/:id/annotations` · `POST /articles/:id/annotations` · `PATCH/DELETE /annotations/:id`
**Courses**: `GET /courses` (+ `progress` 0-1) · `GET /courses/:id` → course + items (with article/quiz/deck summary + `done` per item) · `POST/PATCH/DELETE` (body `items:[{type, articleId|quizId|deckId}]` replaces) · `POST /courses/:id/complete`
**Paths**: `GET /paths` · `GET /paths/:id` → path + courses (with progress) · `POST/PATCH/DELETE` (body `courseIds[]`)
**Decks**: `GET /decks` (+ `cardCount, dueCount`) · `GET /decks/:id` (cards) · `POST/PATCH/DELETE` (body `cards[]` replaces) · `GET /decks/:id/study` → due + new cards (max 20) · `POST /flashcards/:id/review {grade: 0|1|2|3}` (again/hard/good/easy → SM-2) → review state
**Groups**: `GET /groups` (mine; all for TEACHER/ADMIN) · `GET /groups/:id` → group + members + assignments · `POST/PATCH/DELETE` · `POST /groups/:id/members {userIds}` · `DELETE /groups/:id/members/:userId`
**Assignments**: `GET /assignments/mine` → with `done` + `content` summary · `GET /assignments?groupId` · `POST /assignments {contentType, contentId, groupIds?, userIds?, dueAt?}` · `DELETE /assignments/:id`
**Notifications**: `GET /notifications` · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `DELETE /notifications`
**Comments**: `GET /comments?targetType&targetId` (threaded, with user) · `POST /comments {targetType,targetId,body,parentId?}` · `DELETE /comments/:id`
**Bookmarks**: `GET /bookmarks` → with content summary · `POST /bookmarks/toggle {contentType, contentId}` → `{bookmarked}`
**Visibility**: `PATCH /content/:type/:id/visibility {visibility, passcode?, groupIds?}` · `GET /content/permissions` (all content with visibility, ADMIN) · `POST /content/:type/:id/unlock {passcode}`
**Search**: `GET /search?q` → `{quizzes, articles, courses, paths, decks}` (max 5 each)
**Uploads**: `POST /uploads` (multipart `file`, images ≤5MB) → `{url}` served from `/api/uploads/...`

Backend ownership:
- API-CORE: scaffold, `prisma/schema.prisma` (ALL models above), seed, docker-compose, `common/` (PrismaService, guards `JwtAuthGuard` global + `@Public()`, `@Roles()`, `@CurrentUser()`), auth, users/me, quizzes, attempts (grading engine), practice, bank, stats, gamification (exports `GamificationService.awardXp/onEvent`), notifications (exports `NotificationsService.notify(userIds, {type,title,body,link})`), uploads. Creates `apps/api/.scaffold-ready` after schema + prisma generate + common + auth + notifications/gamification services compile.
- API-CONTENT: articles, annotations, courses, paths, decks/flashcards (SM-2), groups, assignments, comments, bookmarks, visibility/content-access, search, ai. Each in `src/modules/<name>/`; register in `app.module.ts` (re-read before editing; small edits only).
