# Hugo DEMENEZ's Personal Website

This is my personal portfolio and blog, built with the latest web technologies.

## ⚡️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Content**: [Next MDX](https://nextjs.org/docs/app/building-your-application/configuring/mdx) for blog posts and pages

## 🚀 Features

- **Substack Integration**: 
  - Leverages **Server Component Caching** (`use cache` directive) for optimal performance.
  - Fetches posts directly from Substack's API (`/api/v1/posts/{slug}`) and converts HTML to Markdown using a zero-dependency converter, rendering them as MDX on the blog.
  
- **Modern UI**:
  - Clean and responsive design using the latest Tailwind CSS v4 features.
  - Optimized web font loading (Geist & Geist Mono).

## 🛠️ Development

```bash
npm install
npm run dev
```

## ☁️ Deployment

Deployed on [Vercel](https://vercel.com).

### Current location

The location pill reads a `current_location` record from Vercel Global Config
(formerly Edge Config) and combines it with current conditions from Open-Meteo.
The homepage also draws a rough world map from the same record. Global
Config must stay small, so the store keeps the current country plus at most
two earlier countries (three distinct stays). A fourth new country drops the
least-used older stay; the next write also trims any oversized record
already in the store. Day counts stay on those few entries; the map keeps
the whole world in view and circles regions by hand — most of the time,
casual, and a couple still ahead — rather than pins or numbers. The United
States and Canada sit on the map as places I'd like to go, in a
complementary blue; they are not part of the location store.
Location and the composed pill stay in the static shell, the same way recent
runs do: the last known country is prerendered into the page, then refreshed in
the background about once a minute. The cache is only discarded after a week
without traffic, so the homepage does not suspend into a skeleton.
Weather responses are cached separately by rounded coordinates for several
minutes. A successful Shortcut ping also revalidates the location tag so the
next visitor picks up the new country without waiting out that minute. If the
store is unavailable or contains an invalid value, Portugal is used as the
home base.

Create a Global Config store in Vercel, connect it to this project, and configure:

| Variable | Purpose |
| --- | --- |
| `GLOBAL_CONFIG` | Read connection string injected by the Global Config connection |
| `GLOBAL_CONFIG_ID` | Store ID used by the update route |
| `GLOBAL_CONFIG_WRITE_TOKEN` | Sensitive, project-scoped Vercel access token used only by the server-side write route |
| `GLOBAL_CONFIG_TEAM_ID` | Optional team ID for a team-owned store |
| `LOCATION_UPDATE_SECRET` | A separate, random secret known by the iPhone Shortcut |

The initial store item is optional. When present, its key is
`current_location`. Version 1 and 2 records are still readable and are
upgraded to version 3 (country only, no locality names) on the next
successful update. The stored shape is:

```json
{
  "version": 3,
  "country": "Portugal",
  "latitude": 38.72,
  "longitude": -9.14,
  "updatedAt": "2026-08-01T08:00:00.000Z",
  "places": [
    {
      "country": "Portugal",
      "latitude": 38.72,
      "longitude": -9.14,
      "days": 12,
      "lastSeenAt": "2026-08-01T08:00:00.000Z"
    }
  ]
}
```

The protected endpoint accepts `POST /api/location/update` with a bearer token.
The request body is `country`, `latitude`, and `longitude`. Extra fields are
ignored. It validates the country name, accepts the numeric or plain-text
decimal coordinates produced by Apple Shortcuts, and rounds them to two
decimals. Each accepted ping updates the current country, increments that
country's day count once per UTC calendar day, and keeps at most three
distinct countries, so a retried Shortcut run does not double-count or grow
the store.
It rejects whole-degree coordinates instead of guessing or substituting a place.
Never expose `GLOBAL_CONFIG_WRITE_TOKEN` to the Shortcut. Give the token access
only to this project, set an expiration, and record its rotation date in Vercel.

#### iPhone Shortcut

Create a Shortcut named **Update website location**:

1. Add **Get Current Location**.
2. Read **Country**, **Latitude**, and **Longitude** from that location.
   Pass the three magic variables directly into the JSON body. Do not add a
   **Number** or **Format Number** action, because it can strip coordinate
   precision under locale-specific formatting.
3. Add **Get Contents of URL** using
   `https://www.hugodemenez.fr/api/location/update`.
4. Choose `POST`, set the request body to JSON, and add the three fields as
   `country`, `latitude`, and `longitude`.
5. Add an `Authorization` header whose value is
   `Bearer <LOCATION_UPDATE_SECRET>`.
6. If the response's `ok` value is not true, show a failure notification.

In the Shortcuts **Automation** tab, create a daily 8:00 AM automation, select
this Shortcut, enable **Run Immediately**, and disable success notifications.
Run it manually once before enabling the schedule and confirm the endpoint
returns `200` with the country and `updatedAt` fields.

### Recent runs

The homepage Running section reads completed `run` activities from
[Shape Calendar](https://shapecalendar.com/api). Configure:

| Variable | Purpose |
| --- | --- |
| `SHAPE_API_KEY` | Bearer token from Shape Settings → API access (`shape_…`) |

The heading and why-I-run note are static. The route cards are a
cached component (`use cache`, `cacheLife("hours")`) rendered in the
static tree, so Next prerenders them during `next build` and the first
Shape fetch happens there. Later requests reuse that HTML and refresh
in the background. The server loads the last 180 days, drops walks
and HealthKit/Strava duplicates, then groups mapped routes that start
in the same area. Each card is a smooth polyline of the latest loop
with faint traces of the other runs there. The grid is captioned
“Areas where I usually run.” Shape has no country field, so a card
shows a country only when the cluster sits near one of the few
stays in `current_location` (within 15 km). Route clustering itself
stays at 8 km so distinct loops do not merge. Otherwise the name is
omitted. Cards also show run count and day span. If the Shape key is
missing, Shape is unreachable, or the live payload is empty, the page
uses a checked-in snapshot of mapped runs (the same idea as the
Portugal home base and the Edith Piaf track).

### Spotify authorization

The homepage reads user-specific Spotify data with the Authorization Code flow
and shows the most-played track from the last seven days. Spotify only returns
the 50 most recent plays, so a heavy listening week is ranked from that window
rather than a complete seven-day history.

Refresh tokens expire six calendar months after the user clicks Agree. Refreshing
an access token does not extend that lifetime. A daily Vercel cron
(`0 8 * * *` UTC, `/api/spotify/cron`) probes expiry and, when the token is
expired, within 14 days of expiry, or rejected with `invalid_grant`, sends one
Telegram message with `https://www.hugodemenez.fr/api/spotify/authorize`.
`/api/spotify/authorize` starts OAuth only in that window; a healthy token
returns `still valid` and is not rotated. The callback writes
`SPOTIFY_REFRESH_TOKEN` and `SPOTIFY_AUTHORIZED_AT` through the Vercel API and
redeploys production so the new values load. It does not echo the secret.

Required environment variable names:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`
- `SPOTIFY_REFRESH_TOKEN`
- `SPOTIFY_AUTHORIZED_AT`
- `SPOTIFY_EXPIRY_PINGED_FOR`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID` (optional; documented project fallback is used if unset)
- `VERCEL_TEAM_ID` (optional; `VERCEL_ORG_ID` or the documented team fallback)
