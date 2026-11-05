# Eduventure

**İngilis dilini birlikdə öyrənək.** Eduventure — müəllim Sədaqət Ağayeva (Seda) tərəfindən yaradılmış, Azərbaycan dilində interfeysi olan ingilis dili öyrənmə platformasıdır (LMS). Öyrənmə bir ekspedisiyadır: hər test bir zirvə, hər XP bir yüksəklik, hər seriya (streak) bir düşərgə odudur.

[![CI](https://github.com/nurirustamov/nurirustamov.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/nurirustamov/nurirustamov.github.io/actions/workflows/ci.yml)

> Eduventure 2.0 is a full rewrite of the original Create React App + Supabase project as a **Next.js 15 + NestJS 11 + PostgreSQL** monorepo. English summary → [below](#english).

---

## Mündəricat

- [Haqqında](#haqqında)
- [İmkanlar](#imkanlar)
- [Arxitektura](#arxitektura)
- [Sürətli başlanğıc (Docker)](#sürətli-başlanğıc-docker)
- [Lokal inkişaf (Docker-siz)](#lokal-inkişaf-docker-siz)
- [Mühit dəyişənləri](#mühit-dəyişənləri)
- [Demo hesablar](#demo-hesablar)
- [Layihə strukturu](#layihə-strukturu)
- [Skriptlər](#skriptlər)
- [Deploy](#deploy)
- [Köhnə versiya](#köhnə-versiya)
- [English](#english)

---

## Haqqında

Eduventure müəllimlərə test, məqalə, kurs, öyrənmə yolu və fləşkart dəstləri yaratmağa, onları qruplara təyin etməyə və nəticələri izləməyə imkan verir. Tələbələr isə testlər həll edir, zəif mövzular üzrə ağıllı məşq edir, SM-2 alqoritmi ilə söz öyrənir, XP toplayır, səviyyə qaldırır və liderlər cədvəlində yarışır.

- **Rollar:** `STUDENT` (tələbə), `TEACHER` (müəllim — Studio), `ADMIN` (idarəetmə paneli; bütün icazələr).
- **Dil:** interfeys tam Azərbaycan dilindədir (ə, ğ, ı, ö, ü, ş, ç).
- **Dizayn:** "Night Expedition" — topoqrafik kontur xətləri, cığır animasiyaları, qaranlıq (default) və "kağız xəritə" işıqlı tema, `motion` ilə mikro-animasiyalar.

## İmkanlar

**Testlər və qiymətləndirmə**
- 7 sual tipi: tək seçim, çox seçim, mətn cavabı, doğru/yanlış, sıralama (drag & drop), boşluq doldurma, açıq sual (müəllim yoxlaması).
- İmtahan (`EXAM`) və məşq (`PRACTICE`) rejimləri; məşqdə hər sualı dərhal yoxlamaq.
- Vaxt limiti, keçid faizi, cəhd limiti, sualların/variantların qarışdırılması, cavabları göstərmə, avtomatik yadda saxlama.
- Görünürlük: hamıya açıq, gizli, yalnız qruplara, şifrə ilə.
- CSV idxalı, test klonlama, sual bankı, AI ilə sual generasiyası (Gemini; açar yoxdursa deterministik mock).
- Açıq suallar üçün müəllim yoxlama növbəsi (`/studio/review`), rəy və bal.
- Nəticə və ətraflı baxış səhifələri, zirvə bayrağı + konfetti.

**Öyrənmə**
- **Ağıllı məşq:** səhv cavablandırılmış suallardan zəif mövzular (teqlər) üzrə virtual test.
- **Məqalələr:** Markdown, oxuma irəliləyişi, mətndə rəngli qeydlər/annotasiyalar, əlaqəli testlər.
- **Kurslar:** məqalə + test + fləşkart elementlərindən ibarət ardıcıllıq, irəliləyiş və tamamlama.
- **Öyrənmə yolları:** kursların ardıcıllığı (cığır xəritəsi).
- **Fləşkartlar:** SM-2 aralıqlı təkrar (Again / Hard / Good / Easy), 3D çevrilən kartlar.
- Əlfəcinlər, qlobal axtarış (⌘K komanda paneli), şərhlər (ağac strukturu).

**İcma və motivasiya**
- XP, səviyyələr, gündəlik seriya (streak), nailiyyətlər, gündəlik/həftəlik tapşırıqlar (quests).
- Liderlər cədvəli (həftə / ay / bütün dövr, qrup üzrə).
- Qruplar, tapşırıqlar (son tarix ilə), bildirişlər, ictimai profillər.

**Studio və Admin**
- Müəllim Studio-su: test redaktoru, sual bankı, məqalə/kurs/yol/dəst redaktorları, yoxlama növbəsi.
- Admin: istifadəçilər və rollar, analitika (test üzrə paylanma, sual çətinliyi, tələbə hesabatı, qrup analizi), tapşırıq (quest) və nailiyyət idarəsi, icazələr (məzmun görünürlüyü).

## Arxitektura

```mermaid
flowchart LR
  B["Brauzer"] -->|"HTTPS :3000"| W["apps/web<br/>Next.js 15 (App Router)"]
  W -->|"rewrite /api/* → API_URL<br/>(server-side proxy)"| A["apps/api<br/>NestJS 11 · :4000 · /api"]
  A -->|"Prisma 6"| P[("PostgreSQL 16")]
  A -->|"/api/uploads"| U[("uploads<br/>(disk / volume)")]
  A -.->|"opsional"| G["Google Gemini<br/>(AI suallar)"]
```

- Brauzer **yalnız** web tətbiqi ilə danışır. Next.js `/api/:path*` sorğularını API-yə ötürür, buna görə autentifikasiya kukiləri (`access_token` 15 dəq + `refresh_token` 30 gün, `httpOnly`) eyni mənbədə (same-origin) işləyir.
- API: modul əsaslı NestJS (auth, quizzes, attempts, practice, bank, ai, stats, gamification, notifications, uploads, articles, courses, paths, decks, groups, assignments, comments, bookmarks, content/visibility, search). Qlobal `JwtAuthGuard` + `RolesGuard`, `@Public()` və `@Roles()` dekoratorları.
- Ətraflı: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (modullar, auth axını, qiymətləndirmə mühərriki, qamifikasiya, görünürlük modeli, SM-2). Spesifikasiya: [docs/SPEC.md](docs/SPEC.md).

## Sürətli başlanğıc (Docker)

Tələblər: Docker 24+ və Docker Compose v2.

```bash
git clone https://github.com/nurirustamov/nurirustamov.github.io.git eduventure
cd eduventure

cp .env.prod.example .env          # sirləri dəyişin: openssl rand -hex 32
# ilk işə salınma üçün demo məlumatlar: .env-də SEED_ON_START=true

docker compose -f docker-compose.prod.yml up -d --build
```

- Web: <http://localhost:3000> · API (yalnız lokal debug): <http://localhost:4000/api/health>
- API konteyneri hər başlanğıcda `prisma migrate deploy` icra edir.
- Demo məlumatları sonradan yükləmək: `docker compose -f docker-compose.prod.yml exec api prisma db seed`
- Loglar: `npm run docker:logs` · dayandırmaq: `npm run docker:down`
- Məlumatlar `pgdata` və `uploads` adlı Docker volume-larında saxlanılır.

> Plain HTTP üzərindən (məs. `http://localhost`) test edərkən `.env`-də `COOKIE_SECURE=false` saxlayın; HTTPS arxasında `true` edin.

## Lokal inkişaf (Docker-siz)

Tələblər: **Node.js 22**, npm 10, PostgreSQL 16 (lokal və ya `npm run db:up` ilə yalnız DB konteyneri).

```bash
# 1) Asılılıqlar
npm run install:all                       # apps/api + apps/web

# 2) Verilənlər bazası
npm run db:up                             # docker-compose.yml → postgres:16 (eduventure/eduventure)
#    və ya lokal Postgres:
#    createuser -P eduventure && createdb -O eduventure eduventure

# 3) Mühit faylları
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4) Sxem + demo məlumatlar
npm run db:migrate                        # prisma migrate dev
npm run db:seed

# 5) İşə salın (API :4000 + Web :3000)
npm run dev
```

Brauzerdə <http://localhost:3000> açın. API ayrıca: `npm run dev:api`, web ayrıca: `npm run dev:web`.

## Mühit dəyişənləri

**API (`apps/api/.env`)**

| Dəyişən | Məcburi | Default | Təsvir |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL bağlantısı, məs. `postgresql://eduventure:eduventure@localhost:5432/eduventure?schema=public` |
| `JWT_ACCESS_SECRET` | ✅ (prod) | dev dəyəri | Access token (15 dəq) imza açarı |
| `JWT_REFRESH_SECRET` | ✅ (prod) | dev dəyəri | Refresh token (30 gün) imza açarı — access açarından fərqli olmalıdır |
| `WEB_ORIGIN` | | `http://localhost:3000` | CORS üçün icazəli mənbə(lər), vergüllə ayrılmış |
| `PORT` | | `4000` | API portu (prefiks `/api`) |
| `UPLOAD_DIR` | | `./uploads` | Yüklənən şəkillərin qovluğu (`/api/uploads/...` kimi verilir) |
| `GEMINI_API_KEY` | | boş | Google Gemini açarı (`POST /api/ai/generate-questions`); boşdursa mock |
| `COOKIE_SECURE` | | `true` (prod) | `false` olarsa production-da da kukilər `Secure` bayrağı almır |
| `NODE_ENV` | | — | `production` → `Secure` kukilər |
| `SEED_ON_START` | | `false` | Yalnız Docker: başlanğıcda `prisma db seed` |
| `SKIP_MIGRATIONS` | | `false` | Yalnız Docker: başlanğıcda miqrasiyaları ötür |

**Web (`apps/web/.env.local`)**

| Dəyişən | Default | Təsvir |
|---|---|---|
| `API_URL` | `http://localhost:4000` | API ünvanı. `/api/*` rewrite-ları **build zamanı** hesablanır — Docker/Vercel-də build-dən əvvəl təyin edin. SSR sorğuları üçün runtime-da da istifadə olunur. |
| `PORT` | `3000` | Web portu (Docker) |

**Docker Compose (`.env`, bax `.env.prod.example`)**

| Dəyişən | Default | Təsvir |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` | `eduventure` | Baza adı və istifadəçi |
| `POSTGRES_PASSWORD` | — (məcburi) | Baza şifrəsi (URL-safe simvollar) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | — (məcburi) | Yuxarıya bax |
| `WEB_ORIGIN`, `COOKIE_SECURE`, `GEMINI_API_KEY`, `SEED_ON_START` | | Yuxarıya bax |
| `WEB_PORT` / `API_PORT` | `3000` / `4000` | Host portları (API yalnız `127.0.0.1`-də açılır) |

## Demo hesablar

`npm run db:seed` (və ya `SEED_ON_START=true`) aşağıdakı hesabları yaradır:

| Rol | E-poçt | Şifrə |
|---|---|---|
| Admin | `admin@eduventure.az` | `Admin123!` |
| Müəllim (Sədaqət Ağayeva) | `seda@eduventure.az` | `Teacher123!` |
| Tələbələr | seed-dəki tələbə hesabları (`apps/api/prisma/seed.ts`) | `Student123!` |

> ⚠️ Production-da demo şifrələri dərhal dəyişin və ya seed-i işlətməyin.

## Layihə strukturu

```
.
├── apps/
│   ├── api/                      NestJS 11 + Prisma 6 (port 4000, prefiks /api)
│   │   ├── prisma/               schema.prisma, migrations/, seed.ts
│   │   ├── src/
│   │   │   ├── common/           PrismaService, guard-lar, dekoratorlar, AccessService, utils
│   │   │   ├── modules/<ad>/     controller + service + dto (auth, quizzes, attempts, …)
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   └── docker-entrypoint.sh  migrate deploy → (seed) → node dist/main
│   └── web/                      Next.js 15 App Router + Tailwind v4 + motion
│       ├── src/app/              (marketing) · (auth) · (app) · (focus) marşrut qrupları
│       ├── src/components/       ui/ · motion/ · shell/
│       ├── src/features/         quiz/ · learn/ · community/ · admin/
│       ├── src/lib/              api klienti, auth, tiplər, utils
│       └── Dockerfile
├── docs/                         SPEC.md · ARCHITECTURE.md · DEPLOY.md
├── .github/                      CI workflow + Dependabot
├── docker-compose.yml            dev: yalnız PostgreSQL
├── docker-compose.prod.yml       db + api + web
└── package.json                  monorepo skriptləri
```

## Skriptlər

Kökdə (`package.json`):

| Skript | Nə edir |
|---|---|
| `npm run install:all` | `apps/api` və `apps/web` asılılıqlarını quraşdırır |
| `npm run dev` | API (watch) + Web (dev) paralel işə salır |
| `npm run dev:api` / `npm run dev:web` | Ayrı-ayrılıqda |
| `npm run build` | Hər iki tətbiqi build edir |
| `npm run typecheck` | Hər iki tətbiqdə `tsc --noEmit` |
| `npm run db:up` | Dev PostgreSQL konteyneri (`docker-compose.yml`) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Demo məlumatlar |
| `npm run docker:up` / `docker:down` / `docker:logs` | `docker-compose.prod.yml` stack-i |
| `npm run docker:seed` | Konteynerdə `prisma db seed` |

`apps/api`: `start:dev`, `build`, `start:prod`, `typecheck`, `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:studio`, `db:seed`, `db:reset`.
`apps/web`: `dev`, `build`, `start`, `typecheck`.

## Deploy

Tövsiyə olunan topologiya: **Vercel** (web) + **Render / Railway / Fly.io** (API, Docker) + idarə olunan **PostgreSQL** (Neon, Supabase, Render, Railway). Alternativ: bir VPS-də `docker-compose.prod.yml` + HTTPS üçün Caddy/Nginx.

Əsas qaydalar:
- Vercel-də **Root Directory** = `apps/web`, `API_URL` = API-nin ictimai URL-i (build zamanı lazımdır).
- API-də `WEB_ORIGIN` = web domeni, `NODE_ENV=production`, güclü JWT sirləri, `/api/health` sağlamlıq yoxlaması, `/app/uploads` üçün daimi disk/volume.
- Miqrasiyalar API konteyneri başlayanda avtomatik tətbiq olunur (`prisma migrate deploy`).

Addım-addım təlimat: [docs/DEPLOY.md](docs/DEPLOY.md).

## Köhnə versiya

İlkin Create React App + Supabase versiyası koddan silinib və git-də `legacy-v1` budağında saxlanılıb (`git checkout legacy-v1`). O, yalnız funksionallığı müqayisə etmək üçün istinaddır, yeni CI tərəfindən build edilmir və yeni tətbiqlə əlaqəli deyil.

---

## English

**Eduventure** is an English-learning LMS for Azerbaijani speakers (UI in Azerbaijani), created by English teacher Sədaqət Ağayeva ("Seda"). Version 2.0 rewrites the original CRA + Supabase app (kept in git branch `legacy-v1`) as a monorepo:

- `apps/api` — **NestJS 11 + Prisma 6 + PostgreSQL 16**, port `4000`, global prefix `/api`, httpOnly cookie auth (15-min access + 30-day refresh JWT with token versioning).
- `apps/web` — **Next.js 15 App Router + Tailwind v4 + motion**, port `3000`; rewrites `/api/*` to `API_URL`, so the browser is same-origin with the API.

**Features:** 7 question types with exam/practice modes, timers, passcodes, shuffling, attempt limits, CSV import, question bank and AI question generation (Gemini or deterministic mock), manual review of open answers, smart practice from weak topics, markdown articles with reading progress and highlights, courses, learning paths, SM-2 flashcards, groups and assignments, notifications, threaded comments, bookmarks, ⌘K search, XP/levels/streaks/achievements/quests, leaderboards, teacher Studio, admin analytics and content-visibility management (public / private / groups / passcode).

**Quick start (Docker):**

```bash
cp .env.prod.example .env    # set secrets; SEED_ON_START=true for demo data
docker compose -f docker-compose.prod.yml up -d --build
# → http://localhost:3000
```

**Local dev:** Node 22 + Postgres 16 → `npm run install:all`, `npm run db:up`, copy `apps/api/.env.example` → `apps/api/.env` and `apps/web/.env.example` → `apps/web/.env.local`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`.

**Demo accounts:** `admin@eduventure.az` / `Admin123!` · `seda@eduventure.az` / `Teacher123!` (teacher) · students / `Student123!`.

**Docs:** [Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOY.md) (Vercel + Render/Railway/Fly + managed Postgres, or a single VPS with Docker Compose) · [Spec](docs/SPEC.md).
