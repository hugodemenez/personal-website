import { createClient } from "@vercel/global-config";
import { cacheLife } from "next/cache";
import {
  CURRENT_LOCATION_KEY,
  parseStoredLocation,
  toVisitedPlaces,
  type StoredLocation,
  type VisitedPlace,
} from "@/server/location-data";

const LISBON_HOME = {
  city: "Lisbon",
  country: "Portugal",
  latitude: 38.72,
  longitude: -9.14,
};

interface OpenMeteoResponse {
  timezone?: string;
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
}

interface CurrentWeather {
  timeZone: string;
  temperature: number;
  condition: string;
}

export interface LocationWeather {
  location: string;
  country: string | null;
  timeZone: string | null;
  temperature: number | null;
  condition: string | null;
  updatedAt: string | null;
  isHomeBase: boolean;
}

export function composeLocationWeather(
  savedLocation: StoredLocation | null,
  weather: CurrentWeather | null
): LocationWeather {
  const location = savedLocation ?? LISBON_HOME;

  return {
    location: location.city,
    country: location.country ?? null,
    timeZone: weather?.timeZone ?? (!savedLocation ? "Europe/Lisbon" : null),
    temperature: weather?.temperature ?? null,
    condition: weather?.condition ?? null,
    updatedAt: savedLocation?.updatedAt ?? null,
    isHomeBase: !savedLocation,
  };
}

function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorms";
}

async function readCurrentLocation(): Promise<StoredLocation | null> {
  "use cache";
  cacheLife("seconds");

  if (!process.env.GLOBAL_CONFIG) return null;

  try {
    const globalConfig = createClient(process.env.GLOBAL_CONFIG, {
      cache: "no-store",
      disableDevelopmentCache: true,
    });
    return parseStoredLocation(await globalConfig.get(CURRENT_LOCATION_KEY));
  } catch {
    console.error("Unable to read the current location from Global Config");
    return null;
  }
}

async function getWeatherForCoordinates(
  latitude: number,
  longitude: number
): Promise<CurrentWeather | null> {
  "use cache";
  cacheLife("minutes");

  const params = new URLSearchParams({
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { headers: { accept: "application/json" } }
    );
    if (!response.ok) throw new Error("Weather service unavailable");

    const data = (await response.json()) as OpenMeteoResponse;
    if (
      !data.timezone ||
      typeof data.current?.temperature_2m !== "number" ||
      typeof data.current.weather_code !== "number"
    ) {
      throw new Error("Weather service returned incomplete conditions");
    }

    return {
      timeZone: data.timezone,
      temperature: Math.round(data.current.temperature_2m),
      condition: describeWeatherCode(data.current.weather_code),
    };
  } catch {
    console.error("Unable to load current weather");
    return null;
  }
}

export interface LocationPageData {
  weather: LocationWeather;
  places: VisitedPlace[];
}

export async function getLocationPageData(): Promise<LocationPageData> {
  "use cache";
  cacheLife("seconds");

  const savedLocation = await readCurrentLocation();
  const location = savedLocation ?? LISBON_HOME;
  const weather = await getWeatherForCoordinates(
    location.latitude,
    location.longitude
  );

  return {
    weather: composeLocationWeather(savedLocation, weather),
    places: toVisitedPlaces(savedLocation),
  };
}

export async function getCurrentLocationWeather(): Promise<LocationWeather> {
  return (await getLocationPageData()).weather;
}
