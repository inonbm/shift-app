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
- [ ] Phase 2 — Auth System
- [ ] Phase 3 — Trainer Dashboard + Math Logic
- [ ] Phase 4 — Foods DB + Diet Generator Algorithm
- [ ] Phase 5 — Trainee View — Dynamic Diet Display
- [ ] Phase 6 — AI Recipe Generator
- [ ] Phase 7 — Workout Tracker
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

## License

Private — All rights reserved.
