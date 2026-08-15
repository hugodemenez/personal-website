const MAX_LOCATION_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export interface LocationWeatherView {
  location: string;
  temperature: number | null;
  condition: string | null;
}

export function locationWeatherSignature(
  weather: LocationWeatherView | null
): string {
  if (!weather) return "";
  return `${weather.location}|${weather.temperature ?? ""}|${weather.condition ?? ""}`;
}

export function locationWeatherChanged(
  previous: LocationWeatherView | null,
  next: LocationWeatherView | null
): boolean {
  return locationWeatherSignature(previous) !== locationWeatherSignature(next);
}

export function isLocationStale(
  updatedAt: string | null,
  now = new Date()
): boolean {
  if (!updatedAt) return false;
  const timestamp = Date.parse(updatedAt);
  return !Number.isFinite(timestamp) || now.getTime() - timestamp > MAX_LOCATION_AGE_MS;
}

export function formatLocalTime(
  timeZone: string | null,
  now = new Date()
): string | null {
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(now);
  } catch {
    return null;
  }
}
