# SHIFT — Diet & Fitness App

A robust, full-stack web application designed for personal trainers and their trainees. Built strictly with the SHIFT methodology, the app provides a localized Hebrew/RTL experience with personalized diet generators, tracking math, and Google Gemini AI recipe integration.

## Tech Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Frontend           | React 19 + TypeScript, Vite 8       |
| Styling            | Tailwind CSS v4                     |
| Icons              | Lucide React                        |
| State Management   | Zustand                             |
| Routing            | React Router v7 (v6 API compatible) |
| Backend / Auth / DB| Supabase (PostgreSQL)               |
| AI Integration     | Google Gemini API (`gemini-2.5-flash`) via Edge Func |
| Hosting            | **Vercel**                          |

## Project Status

- [x] **Phase 0** — Git & Project Setup
- [x] **Phase 1** — DB Schema & Architecture Plan
- [x] **Phase 2** — Auth System
- [x] **Phase 3** — Trainer Dashboard + Math Logic
- [x] **Phase 4** — Foods DB + Diet Generator Algorithm
- [x] **Phase 5** — Trainee View — Dynamic Diet Display
- [x] **Phase 6** — AI Recipe Generator (Supabase Edge Function)
- [x] **Phase 7** — Workout Tracker (Templates & Session Logging)
- [x] **Phase 8** — Deployment & QA Testing Plan

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js >= 20
- npm >= 10
- A Supabase project (Free Tier)
- A Google Gemini API key

### 1. Database Setup
Execute the SQL files in your Supabase SQL Editor in this exact order:
1. `supabase/migrations/001_initial_schema.sql` (Creates tables, triggers, and comprehensive RLS policies)
2. `supabase/migrations/002_seed_foods.sql` (Populates the core nutritional database)

*Note: You must manually configure your first user as a `trainer` via the Supabase dashboard to unlock administrative features.*

### 2. Edge Functions (Gemini AI)
The AI recipe generator securely runs on a Supabase Edge Function to strictly protect your Google API key from the client-side bundle.

Deploy it using the [Supabase CLI](https://supabase.com/docs/guides/cli):
```bash
supabase login
supabase link --project-ref your-project-ref
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase functions deploy generate-recipe
```

### 3. Local Installation
```bash
git clone https://github.com/inonbm/shift-app.git
cd shift-app
npm install

# Copy env template and fill it out
cp .env.example .env.local
```

Your `.env.local` must contain:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=not_needed_locally_if_using_edge_functions
```

Start the dev server:
```bash
npm run dev
```

---

## 🌍 Vercel Deployment Guide

To deploy this project to the world, use Vercel. Continuous Deployment (CD) guarantees that every push to the `main` branch will automatically build and deploy.

### 1. Vercel Project Setup
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Re-authenticate your GitHub account if necessary, and select the `shift-app` repository.

### 2. Configure Settings
Vercel will detect Vite automatically. Ensure the following settings match:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Environment Variables
Expand the **Environment Variables** section in Vercel before clicking Deploy. Add exactly these two keys:
1. `VITE_SUPABASE_URL` (Grab this from Supabase Project Settings -> API)
2. `VITE_SUPABASE_ANON_KEY` (Grab this from Supabase Project Settings -> API)

*(Note: You do NOT need to give Vercel your Gemini API key. That lives exclusively inside Supabase Secrets running the Deno Edge Function).*

### 4. Deploy!
Click **Deploy**. Vercel will build the React application and output a live Production URL.
Use this URL as your Staging Environment to execute the QA & Security Testing Plan.

---

## License

Private — All rights reserved.
