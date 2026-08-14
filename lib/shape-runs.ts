export interface ShapeActivity {
  id: string;
  date: string;
  title: string;
  description?: string | null;
  sportType: string;
  distance?: number | null;
  duration?: number | null;
  speed?: number | null;
  heartRate?: number | null;
  elevationGain?: number | null;
  completed: boolean;
  source?: string | null;
  externalId?: string | null;
  map?: string | null;
}

export interface RecentRun {
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  distanceLabel: string | null;
  durationLabel: string | null;
  paceLabel: string | null;
  mapPath: string | null;
  href: string | null;
}

export const RECENT_RUN_LIMIT = 6;
export const WALKING_PACE_SEC_PER_KM = 9 * 60;
export const MAP_WIDTH = 120;
export const MAP_HEIGHT = 40;
const MAP_PADDING = 2;
const MAX_MAP_POINTS = 180;

export function calendarDate(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? value;
}

export function formatRunDate(value: string): string {
  const date = calendarDate(value);
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) return date;

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function paceSecondsPerKm(
  meters: number,
  seconds: number
): number | null {
  if (meters < 100 || seconds <= 0) return null;
  return seconds / (meters / 1000);
}

export function formatPace(meters: number, seconds: number): string | null {
  const pace = paceSecondsPerKm(meters, seconds);
  if (pace === null) return null;

  const minutes = Math.floor(pace / 60);
  const remainder = Math.round(pace % 60);
  const rolled = remainder === 60;
  const displayMinutes = rolled ? minutes + 1 : minutes;
  const displaySeconds = rolled ? 0 : remainder;

  return `${displayMinutes}:${String(displaySeconds).padStart(2, "0")}/km`;
}

export function isWalkingActivity(activity: ShapeActivity): boolean {
  if (/\bwalk(?:ing)?\b/i.test(activity.title)) return true;

  if (typeof activity.speed === "number" && activity.speed > 0) {
    return activity.speed < 1.5;
  }

  if (
    typeof activity.distance === "number" &&
    typeof activity.duration === "number"
  ) {
    const pace = paceSecondsPerKm(activity.distance, activity.duration);
    return pace !== null && pace >= WALKING_PACE_SEC_PER_KM;
  }

  return false;
}

export function decodePolyline(encoded: string): Array<[number, number]> {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Array<[number, number]> = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

function downsample<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  const lastIndex = items.length - 1;
  const sampled: T[] = [];

  for (let i = 0; i < limit; i += 1) {
    sampled.push(items[Math.round((i * lastIndex) / (limit - 1))]);
  }

  return sampled;
}

export function polylineToSvgPath(
  encoded: string,
  width = MAP_WIDTH,
  height = MAP_HEIGHT
): string | null {
  const points = downsample(decodePolyline(encoded), MAX_MAP_POINTS);
  if (points.length < 2) return null;

  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;
  const innerWidth = width - MAP_PADDING * 2;
  const innerHeight = height - MAP_PADDING * 2;
  const aspect = lngSpan / latSpan;
  const boxAspect = innerWidth / innerHeight;

  let drawWidth = innerWidth;
  let drawHeight = innerHeight;
  let offsetX = MAP_PADDING;
  let offsetY = MAP_PADDING;

  if (aspect > boxAspect) {
    drawHeight = innerWidth / aspect;
    offsetY = MAP_PADDING + (innerHeight - drawHeight) / 2;
  } else {
    drawWidth = innerHeight * aspect;
    offsetX = MAP_PADDING + (innerWidth - drawWidth) / 2;
  }

  return points
    .map(([lat, lng], index) => {
      const x = offsetX + ((lng - minLng) / lngSpan) * drawWidth;
      const y = offsetY + ((maxLat - lat) / latSpan) * drawHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function activityScore(activity: ShapeActivity): number {
  return (
    (activity.map ? 4 : 0) +
    (typeof activity.heartRate === "number" ? 2 : 0) +
    (activity.source === "strava" ? 1 : 0)
  );
}

export function selectRecentRuns(
  activities: ShapeActivity[],
  limit = RECENT_RUN_LIMIT
): ShapeActivity[] {
  const chosen = new Map<string, ShapeActivity>();

  for (const activity of activities) {
    if (activity.sportType !== "run" || !activity.completed) continue;
    if (isWalkingActivity(activity)) continue;

    const distanceBucket =
      typeof activity.distance === "number"
        ? Math.round(activity.distance / 100)
        : "none";
    const key = `${calendarDate(activity.date)}:${distanceBucket}`;
    const existing = chosen.get(key);

    if (!existing || activityScore(activity) > activityScore(existing)) {
      chosen.set(key, activity);
    }
  }

  return [...chosen.values()]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, limit);
}

export function toRecentRun(activity: ShapeActivity): RecentRun {
  const distance =
    typeof activity.distance === "number" ? activity.distance : null;
  const duration =
    typeof activity.duration === "number" ? activity.duration : null;

  return {
    id: activity.id,
    title: activity.title,
    date: calendarDate(activity.date),
    dateLabel: formatRunDate(activity.date),
    distanceLabel: distance !== null ? formatDistance(distance) : null,
    durationLabel: duration !== null ? formatDuration(duration) : null,
    paceLabel:
      distance !== null && duration !== null
        ? formatPace(distance, duration)
        : null,
    mapPath: activity.map ? polylineToSvgPath(activity.map) : null,
    href:
      activity.source === "strava" && activity.externalId
        ? `https://www.strava.com/activities/${activity.externalId}`
        : null,
  };
}
