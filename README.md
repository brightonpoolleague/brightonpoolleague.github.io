# City of Brighton & Hove Pool League

Official web application and live scoring platform for the City of Brighton & Hove Pool League.

Hosted live at: **[brightonpoolleague.github.io](https://brightonpoolleague.github.io/)**

---

## Features

- **Live Scoring & Digital Scorecards**: Real-time match scoring with multi-frame tracking, blind Set 1 secrecy ("folded paper"), Set 2/3 substitutions with opponent approval handshakes, lag winners, break dishes, reverse dishes and dual-captain sign-off via unique 6-digit PIN verification.
- **League Tables & Divisions**: Live calculated standings across Premier League, Division 1, Division 2 and Division 3 with frame differential, bonus points and tiebreakers.
- **Player Stats & Roll of Honour**: Comprehensive player statistics including frames played/won, win percentages, most dishes (Top Dish) and historical Roll of Honour archives.
- **Fixtures & Results**: Filterable match calendar by division, status and date, with downloadable 3x retina high-resolution PNG table and match result scorecard image exports optimised for crisp WhatsApp sharing with mobile-friendly scrollable previews.
- **Venues & Teams**: Directory of venues with map directions, contact numbers, match table quantities and assigned team lists.
- **Admin Portal**: League administration controls for team details, venue tables, PIN management/regeneration, player sign-ons, renames & transfers, League & Knockout Cup fixture scheduling and scorecard review, approval and reopening.
- **System & Database Status Dashboard (`/status`)**: Unlisted live operational status page monitoring real-time concurrent user connections (spectators, captains and admins) via Supabase Realtime Presence, live connected captain sessions, PostgreSQL connection pool health (active queries, idle pool and pool limits), database disk size, server uptime and table record counts.
- **Resilient Offline & Reconnection Support**: Seamless local storage persistence, live offline/weak connection banner and queued automatic background synchronisation for reliable venue use on mobile devices even with poor cellular reception.

---

## Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security & Realtime subscriptions)
- **Testing**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/), [Playwright](https://playwright.dev/) (Headless Chromium + Dockerised Supabase PostgreSQL & PostgREST)
- **Deployment & CI/CD**: [GitHub Pages](https://pages.github.com/) via automated GitHub Actions pipeline (`.github/workflows/pipeline.yml`)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ or v22 LTS recommended)
- npm (v10+)

### Setup & Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/brightonpoolleague/brightonpoolleague.github.io.git
   cd brightonpoolleague.github.io
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (optional for local fallback mode):
   Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   *(If omitted, the app runs in demo/offline mode using built-in seed data).*

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Preview the production build:
   ```bash
   npm run preview
   ```

---

## Testing

```bash
# Typecheck with strict unused locals and parameters
npm run typecheck

# Run unit & component tests (Vitest)
npm run test:unit

# Run headless Chromium end-to-end tests (Playwright)
npm run test:e2e

# Run full containerised E2E suite locally (Docker + PostgreSQL + PostgREST + Realtime + App + Chromium)
docker compose -f docker-compose.test.yml up -d --build --wait
CI_CONTAINERIZED=true npm run test:e2e
docker compose -f docker-compose.test.yml down -v
```

---

## Automated Workflows

- **`test.yml` (PR Quality Gate)**: Runs TypeScript typechecking, Vitest unit and component tests and containerised Playwright E2E tests (spinning up Dockerised PostgreSQL, PostgREST, WebSocket Realtime service and the production app) on every Pull Request to `main`. Publishes inline test tables directly to the GitHub Actions Job Summary.
- **`pipeline.yml` (Path to Production)**: The primary deployment pipeline triggered on every merge (push) to `main` and manual dispatch. Gates on the full test suite before triggering GitHub Pages deployment and Supabase schema synchronisation in parallel.
- **`db-backup.yml`**: Automated weekly SQL dump backup of the Supabase PostgreSQL database scheduled for Tuesday mornings at 03:00 UTC.
- **`keep-alive.yml`**: Daily Supabase ping to prevent database pause on the free tier.
