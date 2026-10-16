# BUILD_SPEC: Home Care Jobs Tracker

A private job aggregator for one user (Harold, Philippines). It collects remote home care scheduling / coordinator jobs from several boards, dedupes them, tags them, and shows them in a clean dashboard. Includes an Apify-style "Sources & Runs" page.

Build in the phases at the bottom. Do not skip ahead. Ask before adding anything not in this spec.

## 1. Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth) for storage and the single-user login
- Scrapers: Node/TypeScript scripts in `/scrapers`, run by GitHub Actions on a schedule (NOT by Vercel functions)
- Hosting: Vercel (site only)
- Playwright only if a source truly needs it; prefer plain fetch + cheerio

## 2. Repo structure

```
/app                  Next.js pages
/components
/lib                  supabase client, types, scoring, dedupe
/scrapers
  index.ts            runs all enabled scrapers, writes to Supabase, logs a run
  config.ts           keywords, exclusions, source toggles
  sources/
    remotive.ts  remoteok.ts  weworkremotely.ts  himalayas.ts  workingnomads.ts
    onlinejobs.ts  jobstreet.ts  workable.ts
/supabase/schema.sql
/.github/workflows/scrape.yml
.env.example
```

## 3. Sources

| Source | Method | Notes |
|---|---|---|
| Remotive | JSON API `https://remotive.com/api/remote-jobs?search=<kw>` | Call only a few times a day. Data is delayed 24h. Do not republish publicly. Link back to the original. |
| Remote OK | JSON `https://remoteok.com/api` | Filter client-side by keyword. Low expected volume. |
| We Work Remotely | RSS `https://weworkremotely.com/remote-job-rss-feed` and category feeds | Attribution required. Filter by keyword. |
| Himalayas | JSON API `https://himalayas.app/jobs/api` (and search endpoint) | Show a visible link to himalayas.app as the data source. Use the Philippines country filter where available. |
| Working Nomads | Public JSON/RSS if available | Verify the endpoint at build time. If none, disable the source and note it on the Sources page. |
| OnlineJobs.ph | HTML scrape of PUBLIC listing pages only, e.g. the Scheduling category and keyword searches | Highest-value source. No login. No bypassing anything. Capture the "Date Updated" field and treat edits as NOT new. Check robots.txt and be gentle. |
| JobStreet PH (ph.jobstreet.com) | HTML scrape of public search pages | Keyword searches: home care scheduler, scheduling coordinator, rostering coordinator, etc. |
| Workable company boards | Public pages: `apply.workable.com/helperheroes`, Pearl Talent, SuperStaff, Hunt St, Winning Assistants | Add companies via config, one entry per board. |

**Indeed is NOT scraped** (their terms prohibit it). Instead, the app has a "Search on Indeed" link-out that opens a prefilled ph.indeed.com search, and the user keeps Indeed email alerts on.

**Not included:** FlexJobs (paywalled), PowerToFly, Wellfound, Dynamite Jobs, Remote100K (no relevant Philippines-eligible listings found). Leave a disabled stub in `config.ts` so they can be added later.

## 4. Scraper rules

- Honest User-Agent identifying a personal script. Max 1 request/second per domain. Respect robots.txt.
- No CAPTCHA solving, no login bypass, no proxy rotation. If a source blocks us, mark it "blocked" on the Sources page and move on.
- One source failing must never stop the others. Wrap each in try/catch and record the error.
- Never store personal data of recruiters. Store only job data and the source URL.

## 5. Keyword config (`config.ts`)

Include (case-insensitive, match title or description):
home care scheduler, homecare scheduler, caregiver scheduler, scheduling assistant, scheduling coordinator, staffing coordinator, rostering coordinator, care coordinator, dispatch coordinator, intake coordinator, recruitment & scheduling, workforce coordinator, placement specialist

Software tags (detect in description): WellSky, AxisCare, ClearCare, AlayaCare, CareSmartz360, ShiftCare, Connecteam, EVV

Exclude: on-site only roles (e.g. "must reside in", US-only residency), RN/LPN-required clinical roles, caregiver/aide (hands-on) roles, sales-only roles. Make this list editable in config.

## 6. Database (`supabase/schema.sql`)

```sql
create table sources (
  id text primary key,            -- 'remotive', 'onlinejobs', ...
  name text not null,
  method text not null,           -- 'api' | 'rss' | 'html'
  enabled boolean default true,
  last_run_at timestamptz,
  last_status text,               -- 'ok' | 'error' | 'blocked'
  last_error text
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text unique not null,        -- normalized company + title
  title text not null,
  company text,
  description text,
  pay_text text,                           -- raw pay string
  pay_usd_hourly_min numeric,
  pay_usd_hourly_max numeric,
  schedule_text text,
  poster_type text,                        -- 'direct' | 'agency' | 'unknown'
  software text[] default '{}',
  region_note text,                        -- e.g. 'Philippines only'
  score int default 0,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  posted_at timestamptz,
  is_active boolean default true,
  status text default 'new',               -- new | saved | applied | interviewing | rejected | ignored
  notes text
);

create table job_sources (                  -- one job can come from several boards
  job_id uuid references jobs(id) on delete cascade,
  source_id text references sources(id),
  url text not null,
  seen_at timestamptz default now(),
  primary key (job_id, source_id)
);

create table runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  source_id text references sources(id),
  status text,
  jobs_found int default 0,
  jobs_new int default 0,
  error text
);
```

Row Level Security: enable on all tables; only the authenticated user can read/write. Scrapers use the service role key (GitHub secret only, never in the browser).

## 7. Processing

- **Dedupe:** `dedupe_key` = lowercase, strip punctuation, `company|title`. Same job on multiple boards becomes one row with multiple `job_sources`.
- **Mark inactive:** if a job isn't seen for 14 days, set `is_active=false`.
- **poster_type:** `agency` if company matches a known list (Helper Heroes, Pearl Talent, ClearDesk, SmartScale360, CS-PAC, T-Mate, SuperStaff, Platonics, OLIVIA, Winning Assistants, Hunt St is `direct`-via-EOR so tag `direct`), `direct` if the poster names itself as the care provider or says "work directly with the owner", else `unknown`. Keep the agency list in config.
- **Pay normalization:** parse USD/hr, USD/month, AUD, PHP. Convert using fixed rates in config (USD1=PHP63, AUD1=USD0.69), assume 173 hrs/month. Keep the raw `pay_text` always.
- **Score (0-100):** +30 direct, +20 names WellSky or AxisCare, +20 pay >= $6/hr equivalent, +15 Philippines-eligible, +10 posted/updated within 7 days, -30 agency/BPO, -20 pay below $5/hr.

## 8. Pages

1. **/ (Jobs):** table + filters (source, direct/agency, min pay, software, status, "new since last visit", active only). Search box. Click a row to open a right-side detail panel with the full description, all source links, status buttons, notes. Sort by score by default.
2. **/sources (Sources & Runs):** a card per source with enabled toggle, last run time, status dot, jobs found/new, last error. Below it, a run log table. This is the Apify-like console.
3. **/settings:** edit keywords, exclusions, agency list, currency rates. Plus the "Search on Indeed" link-outs (prefilled ph.indeed.com queries).
4. **/login:** Supabase email login. No public sign-up. Only the owner's email may sign in.

## 9. Design

Calm, dense, readable. A tool, not a landing page.

- **Layout:** fixed left sidebar (Jobs, Sources, Settings), top bar with search, main content area. Detail panel slides in from the right on desktop; full-screen sheet on mobile.
- **Type:** Inter (or Geist) for UI; tabular numerals for pay and counts. Base 14px, headings 18/24px. Generous row height (44-48px).
- **Color tokens (define as CSS variables, support light + dark via `prefers-color-scheme` and a manual toggle):**
  - Light: bg `#FAF9F6`, surface `#FFFFFF`, border `#E7E4DD`, text `#1C1B19`, muted `#6B675F`
  - Dark: bg `#141413`, surface `#1C1C1A`, border `#2D2C29`, text `#F2F0EA`, muted `#9A968C`
  - Accent (teal) `#0F766E` light / `#2DD4BF` dark. Used for "New", "Direct", and primary buttons.
  - Status: amber for agency, red for error/blocked, green for ok.
- **Components:** pill badges (Direct, Agency, New, WellSky, AxisCare), source chips with a small colored dot, status dots on the Sources page, subtle 1px borders instead of heavy shadows, 8px radius.
- **Empty and loading states** on every page (skeleton rows, "No new jobs since your last visit").
- **Accessibility:** visible focus rings, 4.5:1 text contrast, keyboard navigation in the table, color is never the only signal (badges have text).
- Must work well at 375px width.

## 10. GitHub Actions (`scrape.yml`)

- Triggers: `schedule` every 6 hours + `workflow_dispatch` (manual run button).
- Steps: checkout, setup Node, install, run `npx tsx scrapers/index.ts`.
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 11. Env vars (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # scrapers/GitHub only, never exposed to the browser
OWNER_EMAIL=
```

`.env.local` must be in `.gitignore`. Never commit keys.

## 12. Build phases (stop and report after each)

1. **Foundation:** Next.js + Tailwind + Supabase client, schema.sql, login, empty Jobs/Sources/Settings pages with the design tokens and layout. Seed 10 fake jobs to check the UI.
2. **API/RSS scrapers:** Remotive, Remote OK, WWR, Himalayas, Working Nomads, plus dedupe, scoring, run logging. Run locally and show results on the Jobs page.
3. **HTML scrapers:** OnlineJobs.ph, JobStreet PH, Workable boards. Handle failures gracefully.
4. **Automation:** GitHub Actions workflow, secrets documented, manual-run button works.
5. **Polish:** filters, detail panel, status tracking, mobile pass, dark mode, README with setup + deploy steps.

## 13. Acceptance checks

- Every source can fail without breaking the others.
- Running the scrapers twice does not create duplicate jobs.
- A job found on two boards appears once with two source links.
- Service role key appears nowhere in client code.
- Site is usable at 375px and in dark mode.
- README lets a non-expert deploy it step by step.

## 14. Out of scope

Auto-applying, scraping Indeed, solving CAPTCHAs, emailing recruiters, public sign-up, anything behind a paywall or login.