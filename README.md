# SHIFT — Diet & Fitness App

A full-stack web application for personalized diet planning and workout tracking, built with the SHIFT methodology.

## Tech Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Frontend           | React 19 + TypeScript, Vite 8       |
| Styling            | Tailwind CSS v4                     |
| Icons              | Lucide React                        |
| State Management   | Zustand                             |
| Routing            | React Router v7 (v6 API compatible) |
| Backend / Auth / DB| Supabase (PostgreSQL)               |
| AI Integration     | Google Gemini API (`gemini-2.5-flash`) |
| Hosting            | Firebase Hosting (free tier)        |

## Project Status

- [x] **Phase 0** — Git & Project Setup
- [x] **Phase 1** — DB Schema & Architecture Plan
- [x] **Phase 2** — Auth System
- [x] **Phase 3** — Trainer Dashboard + Math Logic
- [x] **Phase 4** — Foods DB + Diet Generator Algorithm
- [x] **Phase 5** — Trainee View — Dynamic Diet Display
- [x] **Phase 6** — AI Recipe Generator
- [x] **Phase 7** — Workout Tracker
- [ ] Phase 8 — Deployment & Final README

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- A Supabase project (free tier)
- A Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/inonbm/shift-app.git
cd shift-app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your actual keys
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

| Variable                | Description                     |
|-------------------------|---------------------------------|
| `VITE_SUPABASE_URL`     | Your Supabase project URL       |
| `VITE_SUPABASE_ANON_KEY`| Your Supabase anonymous API key |
| `VITE_GEMINI_API_KEY`   | Your Google Gemini API key      |

> ⚠️ **Never commit `.env.local`** — it is listed in `.gitignore`.

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Database Setup

Execute the two SQL files in your Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql` (Creates tables, triggers, and RLS policies)
2. `supabase/migrations/002_seed_foods.sql` (Populates the foods database)

Then configure your first user as a `trainer` to unlock dashboard features.

### Deploying Edge Functions (Gemini AI)

The AI recipe generator securely runs on a Supabase Edge Function to protect your Google Gemini API key.
To deploy it to your Supabase project, install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase functions deploy generate-recipe
```

## License

Private — All rights reserved.
