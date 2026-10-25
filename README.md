# Cadence

Personal training dashboard for Jake Silverman (HYROX, New York). It replaces the old Cadence app with one row per day from WHOOP, Garmin, and MyFitnessPal.

Recovery and strain are dated to the morning he wakes up. Sleep is dated to the night it ended. Both use `America/New_York`. Garmin does not expose sleep on the Personal API, so sleep always comes from WHOOP.

## Local

```bash
npm install
cp .env.example .env.local
# set DASHBOARD_PASSWORD at minimum
npm run seed
npm run dev
```

The app is at [http://127.0.0.1:43123](http://127.0.0.1:43123).

Without `DATABASE_URL`, Cadence uses an embedded Postgres database in `.data/pglite` (gitignored). On Vercel you need a hosted database. The embedded database is only for local development.

`npm run seed` imports `fixtures/daily.csv` (a real 30-day merge). If `garmin.json` and `whoop.json` sit in the same folder, the script also fills stress, body battery, BMR, and the session list from those raw responses.

```bash
npm test
npm run typecheck
npm run lint
```

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DASHBOARD_PASSWORD` | yes | Password for the site and for `POST /api/nutrition` |
| `CRON_SECRET` | yes on Vercel | Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` |
| `DATABASE_URL` | yes on Vercel | Neon or Vercel Postgres connection string. `POSTGRES_URL` is also accepted |
| `WHOOP_CLIENT_ID` | for WHOOP pulls | Personal app client id |
| `WHOOP_CLIENT_SECRET` | for WHOOP pulls | Personal app secret |
| `WHOOP_REFRESH_TOKEN` | for the first WHOOP pull | Offline refresh token. After the first successful refresh, the database copy is the one that matters |
| `GARMIN_PERSONAL_API_KEY` | for Garmin pulls | Sent as `Authorization: ApiKey <key>` |
| `SYNC_LOOKBACK_DAYS` | no | Days to pull after data already exists. Default `7`. An empty database always backfills 30 |

Never commit `.env.local` or a real refresh token. `.env.example` lists the names only.

## What Jake has to do

1. **Database.** Create a Neon database, or add Vercel Postgres / Neon from the Vercel Storage tab. Copy the pooled connection string into `DATABASE_URL`. The app creates its tables on the first request (`daily_metrics`, `activities`, `oauth_tokens`, `sync_runs`). `npm run db:push` is an optional Drizzle Kit push against `DATABASE_URL` if you want to manage the schema from the CLI instead.

2. **Password and cron secret.** Set `DASHBOARD_PASSWORD` and `CRON_SECRET` in the Vercel project (Production, and Preview if you use it).

3. **WHOOP.** Create a personal app at [developer.whoop.com](https://developer.whoop.com) with the scopes `offline`, `read:recovery`, `read:cycles`, `read:sleep`, and `read:workout`. Put the client id and secret in the env. Get the first refresh token once:

   Open this in a browser (use the app’s redirect URI):

   ```text
   https://api.prod.whoop.com/oauth/oauth2/auth?response_type=code&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&scope=offline%20read:recovery%20read:cycles%20read:sleep%20read:workout&state=cadence
   ```

   Exchange the code:

   ```bash
   curl -X POST https://api.prod.whoop.com/oauth/oauth2/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=CODE&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&redirect_uri=REDIRECT_URI"
   ```

   Put `refresh_token` in `WHOOP_REFRESH_TOKEN`.

   Each pull refreshes the access token at `https://api.prod.whoop.com/oauth/oauth2/token` with `grant_type=refresh_token` and `scope=offline`. WHOOP rotates the refresh token. Cadence writes the new one to `oauth_tokens` immediately and uses that row on the next run. The env var is only the bootstrap. If a refresh starts failing with 401, delete the `whoop` row from `oauth_tokens` and set a freshly issued `WHOOP_REFRESH_TOKEN`.

4. **Garmin.** Put the Connect Personal API key in `GARMIN_PERSONAL_API_KEY`. Cadence exchanges it for a JWT (`Authorization: ApiKey <key>` against `personalapitoken-service`) and caches that JWT until about five minutes before `exp`. Daily summaries and activities are then requested with `Authorization: Bearer <jwt>`.

5. **MyFitnessPal.** There is no API. On the Fuel page, upload the Nutrition Summary CSV (`Date`, `Meal`, `Calories`, `Fat (g)`, `Carbohydrates (g)`, `Protein (g)`). Meals are summed per date. A script can push the same file:

   ```bash
   curl -X POST https://YOUR_APP.vercel.app/api/nutrition \
     -H "Authorization: Bearer $DASHBOARD_PASSWORD" \
     -H "Content-Type: text/csv" \
     --data-binary @Nutrition-Summary.csv
   ```

6. **First pull.** Sign in and use **Backfill 30 days**, or wait for the morning cron. Later refreshes use `SYNC_LOOKBACK_DAYS` (default 7) so recent WHOOP rescores get rewritten. If WHOOP or Garmin fails, the other source is still saved and the error stays on the today page.

Targets on the today card are 2,850 kcal, 200 g protein, 321 g carbs, and 85 g fat.

## Deploy on Vercel

1. Import the Git repository as a Next.js project. Framework preset: Next.js. Root directory: the repo root.
2. Add the environment variables above before the first production deploy.
3. Connect Neon / Vercel Postgres so `DATABASE_URL` (or `POSTGRES_URL`) is present at runtime.
4. Deploy. `vercel.json` registers a cron:

   ```json
   { "path": "/api/cron/refresh", "schedule": "30 10 * * *" }
   ```

   Vercel cron is UTC. `30 10 * * *` is 6:30 AM Eastern Daylight Time and 5:30 AM Eastern Standard Time. In the winter, change the schedule to `30 11 * * *` if you want 6:30 AM EST. Hobby plans allow one daily cron. Vercel will send `Authorization: Bearer <CRON_SECRET>` only when `CRON_SECRET` is set, and the route rejects anything else.

5. Open the deployment, sign in, and run **Backfill 30 days** once so the log is filled before the next morning.

Optional: point `DATABASE_URL` at the same database locally and run `npm run seed` if you want the attached 30-day sample in production before the APIs are connected. Do not leave the sample in place if a real pull should own those dates. A later successful pull overwrites the columns for that source.

## How a pull is dated

- WHOOP cycles and recovery: the New York date when the main (non-nap) sleep for that cycle ended. That is the wake-up morning. Strain and kilocalories (converted with `kcal = kilojoule / 4.184`) stay on that morning. A cycle with no main sleep uses the cycle end in New York. The open cycle is included.
- WHOOP sleep: hours asleep (light + slow wave + REM) and sleep performance, on the New York date the sleep ended. Naps are not added to the night.
- Garmin daily summary: the `calendarDate` from the API (total / active / BMR calories, steps, resting heart rate, average stress, most recent body battery).
- Garmin activities: the local start date, summarized as `sport km min` and stored as sessions.
- MyFitnessPal: the date column in the export, summed across meals.

## Layout

- `src/lib/whoop` and `src/lib/garmin` fetch and normalize. The normalizers are pure and covered by `npm test` against `fixtures/whoop.json` and `fixtures/garmin.json`.
- `src/lib/mfp/parse.ts` reads the Nutrition Summary CSV.
- `src/lib/sync/run.ts` pulls the window, writes whichever source succeeded, and records the errors.
- `src/app/(app)` is the phone-first dashboard: today, 7/30-day charts, sessions, the daily log, and the upload page.
