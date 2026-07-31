import { cacheLife } from "next/cache";

const LISBON_WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=38.7223&longitude=-9.1393&current=temperature_2m,weather_code&timezone=auto";

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
  };
}

export interface LocationWeather {
  location: string;
  time: string;
  temperature: number;
  condition: string;
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

function formatLocalTime(value: string): string {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return "Local time";

  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${match[2]} ${suffix}`;
}

export async function getLisbonWeather(): Promise<LocationWeather | null> {
  "use cache";
  cacheLife("minutes");

  try {
    const response = await fetch(LISBON_WEATHER_URL, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);

    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;

    if (
      !current?.time ||
      typeof current.temperature_2m !== "number" ||
      typeof current.weather_code !== "number"
    ) {
      throw new Error("Open-Meteo returned incomplete current conditions");
    }

    return {
      location: "Lisbon",
      time: formatLocalTime(current.time),
      temperature: Math.round(current.temperature_2m),
      condition: describeWeatherCode(current.weather_code),
    };
  } catch (error) {
    console.error("Unable to load Lisbon weather", error);
    return null;
  }
}
