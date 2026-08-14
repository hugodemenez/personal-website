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

The location pill reads one city-level `current_location` record from Vercel
Global Config (formerly Edge Config) and combines it with current conditions
from Open-Meteo. Location reads expire within 60 seconds; weather is cached
separately by rounded coordinates for several minutes. If the store is
unavailable or contains an invalid value, Lisbon is used as the home base.

Create a Global Config store in Vercel, connect it to this project, and configure:

| Variable | Purpose |
| --- | --- |
| `GLOBAL_CONFIG` | Read connection string injected by the Global Config connection |
| `GLOBAL_CONFIG_ID` | Store ID used by the update route |
| `GLOBAL_CONFIG_WRITE_TOKEN` | Sensitive, project-scoped Vercel access token used only by the server-side write route |
| `GLOBAL_CONFIG_TEAM_ID` | Optional team ID for a team-owned store |
| `LOCATION_UPDATE_SECRET` | A separate, random secret known by the iPhone Shortcut |

The initial store item is optional. When present, its key is
`current_location` and its value has this shape:

```json
{
  "version": 1,
  "city": "Lisbon",
  "country": "Portugal",
  "latitude": 38.72,
  "longitude": -9.14,
  "updatedAt": "2026-08-01T08:00:00.000Z"
}
```

The protected endpoint accepts `POST /api/location/update` with a bearer token.
It validates city and country names, accepts the numeric or plain-text decimal
coordinates produced by Apple Shortcuts, and rounds them to two decimals before
upserting the record through Vercel's authenticated Global Config API. It
rejects whole-degree coordinates instead of guessing or substituting a place.
Never expose `GLOBAL_CONFIG_WRITE_TOKEN` to the Shortcut. Give the token access
only to this project, set an expiration, and record its rotation date in Vercel.

#### iPhone Shortcut

Create a Shortcut named **Update website location**:

1. Add **Get Current Location**.
2. Read **City**, **Country**, **Latitude**, and **Longitude** from that location.
   The weather service uses latitude and longitude directly, so small localities
   such as Azeitão do not need to be replaced with a nearby large city.
   Pass the four magic variables directly into the JSON body. Do not add a
   **Number** or **Format Number** action, because it can strip coordinate
   precision under locale-specific formatting.
3. Add **Get Contents of URL** using
   `https://www.hugodemenez.fr/api/location/update`.
4. Choose `POST`, set the request body to JSON, and add the four fields as
   `city`, `country`, `latitude`, and `longitude`.
5. Add an `Authorization` header whose value is
   `Bearer <LOCATION_UPDATE_SECRET>`.
6. If the response's `ok` value is not true, show a failure notification.

In the Shortcuts **Automation** tab, create a daily 8:00 AM automation, select
this Shortcut, enable **Run Immediately**, and disable success notifications.
Run it manually once before enabling the schedule and confirm the endpoint
returns `200` with the city and `updatedAt` fields.

### Recent runs

The homepage Running carousel reads completed `run` activities from
[Shape Calendar](https://shapecalendar.com/api). Configure:

| Variable | Purpose |
| --- | --- |
| `SHAPE_API_KEY` | Bearer token from Shape Settings → API access (`shape_…`) |

The heading and why-I-run note are static. The carousel is a cached
component (`use cache`, minutes). Suspense falls back to a second
cached component with `cacheLife("max")`, so the last build-time fetch
is in the static shell. The server loads the last 180 days, drops walks
and HealthKit/Strava duplicates, then groups mapped routes that start
in the same area. Each card is a smooth polyline of the latest loop
with faint traces of the other runs there. Strava-sourced cards link
to the public activity. If the key is missing at build, the fallback
is a static placeholder.

### Spotify authorization

The footer reads user-specific Spotify data with the Authorization Code flow. Configure
`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, and
`SPOTIFY_REFRESH_TOKEN` in the deployment environment.

Spotify refresh tokens expire after six months from July 20, 2026. When Spotify returns
`invalid_grant`, the site stops retrying that token and serves the fallback track. To
reauthorize:

1. Open `/api/spotify/authorize` on the deployed site and sign in to Spotify.
2. Replace `SPOTIFY_REFRESH_TOKEN` with the token returned by the callback.
3. Redeploy so all instances discard the expired environment value.
