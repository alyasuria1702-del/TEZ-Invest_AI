# Tez Invest AI

Персональный ИИ-помощник для частного инвестора. Импортируйте портфель из CSV/XLSX, получайте актуальные данные с Московской биржи и краткие аналитические выводы по каждому инструменту.

## Возможности

- Импорт CSV/XLSX от Т-Инвестиций, БКС и в универсальном формате
- Несколько портфелей с переключением в сайдбаре
- Актуальные котировки и история цен (MOEX ISS API)
- Расписание купонов и дивидендов
- ИИ-резюме по каждому инструменту (Anthropic Claude)
- Светлая / тёмная / системная тема

## Стек

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (Auth + PostgreSQL + Row Level Security)
- **Anthropic Claude API** (ИИ-аналитика)
- **MOEX ISS API** (рыночные данные)
- **Tailwind CSS v4** + shadcn/ui

## Быстрый старт

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/ВашЛогин/tez-invest-ai.git
cd tez-invest-ai
npm install
```

### 2. Создайте проект в Supabase

1. Зайдите на [supabase.com](https://supabase.com) → New project
2. В SQL Editor запустите миграции по порядку:
   - `scripts/001_create_tables.sql`
   - `scripts/002_profile_trigger.sql`
   - `scripts/003_optimizations.sql`
   - `scripts/004_multi_portfolio_theme.sql`

### 3. Настройте переменные окружения

```bash
cp .env.example .env.local
```

Откройте `.env.local` и заполните:

| Переменная | Где взять |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

### 4. Запустите локально

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Деплой на Vercel

1. Создайте репозиторий на GitHub и запушьте проект
2. Зайдите на [vercel.com](https://vercel.com) → New Project → Import из GitHub
3. Добавьте все три переменные из `.env.example` в Environment Variables
4. Deploy

После деплоя не забудьте в Supabase → Authentication → URL Configuration добавить ваш Vercel-домен в Redirect URLs.

## Структура проекта

```
├── app/
│   ├── (dashboard)/        # Защищённые страницы (дашборд, портфель, импорт)
│   ├── api/                # API routes (positions, payments, portfolio-history, ai-summary)
│   └── auth/               # Авторизация (login, signup)
├── components/
│   ├── dashboard/          # Компоненты дашборда
│   ├── instrument/         # Карточка инструмента
│   ├── portfolio/          # Управление портфелем
│   └── ui/                 # UI-компоненты (shadcn)
├── lib/
│   ├── services/moex.ts    # Интеграция с MOEX ISS API
│   ├── supabase/           # Клиент Supabase
│   ├── types/database.ts   # TypeScript типы
│   └── utils/              # Форматирование, парсер импорта
└── scripts/                # SQL-миграции для Supabase
```
