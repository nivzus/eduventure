# Eduventure 2.0: где остановились и как продолжить

Снимок на **5 ноября 2026, 11:59 (Баку)**. В это время 8 параллельных агентов были остановлены посреди работы. Ниже по каждой части: что готово и проверено, что не доделано и с чего продолжать.

Источник правды по дизайну и API — [`docs/SPEC.md`](./SPEC.md), читать первым. Старый проект (CRA + Supabase) лежит в `legacy/`, главная логика в `legacy/src/App.js`.

## Последние решения владельца (важно!)
1. **Бренд остаётся оранжевым.** В `apps/web/src/app/globals.css` уже стоят новые токены: `--signal` = «рыжий котик» `#ff8a1f` (тёмная тема) / `#f57c1f` (светлая), `--ember` = янтарный `#ffb547` / жжёный оранжевый `#c2410c`. Прежний лаймовый `#e8ff59` отменён, но ещё **захардкожен** в файлах:
   `components/ui/Avatar.tsx`, `components/brand/{tokens.ts,Logo.tsx}`, `components/motion/confetti.ts`, `app/globals.css` (комментарии и мелкие места), `features/quiz/lib/{utils.ts,constants.ts}`, `features/learn/components/articles/Annotations.tsx`, `features/learn/styles/reader.css`. Заменить на `var(--signal)` или оранжевые оттенки.
2. **Фирменный маскот — рыжий котик** (старый `legacy/src/components/WavingCat.js`).
   - Логотип должен быть с котом. Текущий `components/brand/Logo.tsx` сделан **до** этого решения, в нём кота нет, его нужно переделать.
   - Нужно сделать `components/brand/Mascot.tsx` с режимами `peek | static | celebrate | sad`: машет лапой, моргает, качает хвостом, в облачке 10 фраз из legacy.
   - Нужно сделать `MascotPeek`: выглядывает справа снизу каждые 15–35 секунд, можно закрыть.
   - Где использовать кота: логотип в сайдбаре, лендинг, страницы входа, пустые состояния, результат теста (`celebrate`/`sad`).

## Состояние на момент остановки

**Проверки:**
- `apps/api`: `npx tsc --noEmit` → 0 ошибок.
- `apps/web`: `npx tsc --noEmit` → 0 ошибок.
- PostgreSQL в контейнере работал (`pg_isready` OK). Миграция `prisma/migrations/20261105074745_init` применена.
- API-CORE до остановки проверил живой авторизацией: регистрация, вход и `/me` работали.
- `next build` и e2e не запускались.

### Бэкенд `apps/api` (NestJS 11 + Prisma 6), готово примерно на 70%
| Модуль | Статус |
|---|---|
| `prisma/schema.prisma` | ✅ все модели из SPEC §2 + `ContentUnlock`; миграция init |
| `common/` (Prisma, guards, `@Public/@Roles/@CurrentUser`, `AccessService`) | ✅ (шпаргалка по импортам — в `apps/api/.scaffold-ready`, файл в .gitignore, её текст также в истории этой сессии) |
| auth, notifications, gamification | ✅ зарегистрированы |
| content (видимость/доступ/пароль), articles, courses, paths, decks (+SM-2 `sm2.ts`), groups, assignments, comments, bookmarks, search | ✅ написаны и зарегистрированы. Агент остановился на bookmarks/search: **перепроверить** их по SPEC |
| **users, quizzes (+`question-engine.ts`, `csv-import.ts`), attempts, practice, bank, ai** | ⚠️ файлы есть, но **НЕ зарегистрированы** в `src/app.module.ts` (секция `// ── API-CORE modules ──` пустая). Агент как раз дописывал движок проверки ответов (`question-engine.ts`). Нужно: проверить полноту по SPEC §3, зарегистрировать модули, прогнать tsc |
| stats (`/stats/*`), leaderboard, achievements/quests (+admin CRUD) | ❓ проверить, что есть в `gamification.controller.ts` и `gamification-query.service.ts`. Модуля `stats` нет, **его нужно сделать** |
| uploads (`POST /uploads`, раздача `/api/uploads`) | ❌ нет (папка `uploads/` создана) |
| `prisma/seed.ts` (демо-данные, аккаунты из SPEC) | ❌ нет (скрипт `seed` в package.json уже прописан: `tsx prisma/seed.ts`) |
| корневой `docker-compose.yml` (dev, только БД) | ❌ нет; есть `docker-compose.prod.yml` |
| e2e/unit тесты (особенно движок проверки) | ❌ нет |

### Фронтенд `apps/web` (Next.js 15 + Tailwind v4 + motion), готово примерно на 40%
**Готово:**
- `src/lib/`: `api.ts` (с refresh при 401), `auth.tsx`, `types.ts`, `query.tsx`, `theme.tsx`, `providers.tsx`, `utils.ts`, `hooks.ts`.
- `src/components/ui/`: весь кит + `toast.tsx`.
- `src/components/motion/`: Reveal, Stagger, NumberTicker, Magnetic, Spotlight, TopoBackground, TrailPath, PageTransition, Marquee, KineticText, confetti.
- `src/components/shell/`: AppShell, Rail, MobileNav, CommandPalette (⌘K), NotificationsPopover, StatusChips, UserMenu, ThemeToggle, Splash, nav. Написано, но **ещё не подключено** в layout.
- `globals.css` с токенами (уже оранжевыми).

**🔴 Блокер №1 — нет layout-ов, без них приложение не открывается:**
- `src/app/layout.tsx` (корневой: шрифты, `Providers`, Toaster, скрипт темы без мигания)
- `src/app/(app)/layout.tsx` (оборачивает в `AppShell` + проверка авторизации → `/login`)
- `src/app/(focus)/layout.tsx` (минимальный, без оболочки)
- `src/app/(marketing)/page.tsx` — лендинг `/`
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- `not-found.tsx`, `loading.tsx`, `error.tsx`
- После этого создать маркер `apps/web/.foundation-ready` (он в .gitignore, нужен только агентам).

**Экраны, что есть и чего нет:**

*Квизы* (`features/quiz`):
- **Написано:** `QuizDiscovery`, `QuizCard`, `QuizOverview` (+ModeCards, PasscodeModal, AttemptHistory, AltitudeChart), `AttemptPlayer` (+таймер, ProgressTrail, NavDrawer, SubmitModal, PracticeFeedback, рендереры всех 7 типов вопросов).
- **Не хватает страниц:** `(app)/quizzes/page.tsx`, `(app)/quizzes/[id]/page.tsx`, `(focus)/attempts/[id]/page.tsx`.
- **Не написано:** результат `/attempts/[id]/result`, разбор ошибок `/attempts/[id]/review`, `/practice`, студия (`/studio/quizzes`, редактор `/studio/quizzes/[id]`, `/studio/bank`, `/studio/review*`).

*Обучение* (`features/learn`):
- **Написано:** `ArticlesScreen`, `ArticleReaderScreen` (+Markdown, оглавление, аннотации, прогресс чтения), общие компоненты, комментарии, закладки.
- **Не хватает страниц:** `(app)/articles/page.tsx`, `(app)/articles/[slug]/page.tsx`.
- **Не написано:** курсы, пути (карта-маршрут), колоды и флэшкарты (3D-переворот, `(focus)/decks/[id]/study`), `/bookmarks`, `/search`, студия статей, курсов, путей и колод.

*Сообщество* (`features/community`):
- **Написано со страницами:** dashboard, leaderboard, assignments, groups, groups/[id].
- **Не написано:** `/profile`, `/u/[id]`, `/notifications`, `/studio` (главная студии).

*Админка* (`features/admin`):
- **Написано:** только hooks, charts, analysis, csv.
- **Не написано:** все страницы `/admin/**`.

*Бренд* (`components/brand`):
- **Написано:** `Logo` (без кота, см. выше), `AchievementBadge`, tokens, topo.
- **Не написано:** `Mascot`, `MascotPeek`, иллюстрации (`EmptyTrail, SummitFlag, Compass, Basecamp, MapFolded, Lantern, CardsStack, PeakRange`), favicon, og-image, `public/brand/*`.

### DevOps и документация, готово примерно на 70%
- ✅ `apps/api/Dockerfile` + `docker-entrypoint.sh`, `apps/web/Dockerfile`, `.dockerignore`, `docker-compose.prod.yml`, `.env.prod.example`, `.github/workflows/ci.yml`, `.github/dependabot.yml`.
- ✅ Новый `README.md` и `docs/ARCHITECTURE.md`. Агент остановился на README: **перечитать** и проверить, что он дописан до конца.
- ❌ `docs/DEPLOY.md`. Для Docker-сборки web, вероятно, нужен `output: 'standalone'` в `apps/web/next.config.ts`: проверить по Dockerfile.

## Как запустить то, что есть
```bash
# БД (если есть docker): создать docker-compose.yml с postgres:16 (db/user/pass = eduventure) или локальный Postgres
cp apps/api/.env.example apps/api/.env
npm run install:all
npm --prefix apps/api exec prisma migrate deploy
npm run dev:api        # http://localhost:4000/api/health
npm run dev:web        # http://localhost:3000 (заработает после создания layout-ов, см. Блокер №1)
```

## Порядок продолжения (рекомендация)
1. **Фронтенд-основа (Блокер №1):** layout-ы, лендинг, вход и регистрация, подключение `AppShell`, оранжевая палитра вместо лайма.
2. **Бэкенд:** зарегистрировать модули users/quizzes/attempts/practice/bank/ai; дописать stats, uploads и seed; прогнать smoke-тесты curl.
3. **Страницы-обёртки** для готовых экранов (quizzes, quizzes/[id], attempts/[id], articles, articles/[slug]).
4. **Недописанные экраны** по списку выше. Параллельно можно поручить 3 агентам (quiz / learn / community+admin) по правилам владения папками из SPEC.
5. **Бренд:** логотип с котом, Mascot и MascotPeek, иллюстрации, favicon и OG.
6. **Проверка:** `next build`, проход по сценариям в Playwright (вход → тест → результат → дашборд), скриншоты.
7. **Документация:** `docs/DEPLOY.md`, финальная проверка README.

## Готовый промпт для новой сессии
> Продолжи перестройку Eduventure 2.0 в этом репозитории (ветка `claude/vigilant-tesla-rrhuw9`). Сначала прочитай `docs/HANDOFF.md` и `docs/SPEC.md`. Работай по разделу «Порядок продолжения» начиная с п.1, параллельно где можно (бэкенд и фронтенд независимы). Учитывай решения владельца: бренд оранжевый, логотип и маскот — рыжий котик. Коммить и пушь в эту же ветку.
