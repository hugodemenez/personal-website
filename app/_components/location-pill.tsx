"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LocationWeather } from "@/server/location";
import {
  formatLocalTime,
  isLocationStale,
  locationWeatherChanged,
} from "@/lib/location-display";

interface LocationPillProps {
  weather: LocationWeather | null;
}

const LAST_WEATHER_KEY = "location-weather";
const SWAP_MS = 320;

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-2.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 7.1v3.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
      <circle cx="8" cy="5.15" r=".7" fill="currentColor" />
    </svg>
  );
}

function readLastWeather(): LocationWeather | null {
  try {
    const raw = sessionStorage.getItem(LAST_WEATHER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationWeather;
    return parsed && typeof parsed.location === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeLastWeather(weather: LocationWeather | null) {
  try {
    if (!weather) sessionStorage.removeItem(LAST_WEATHER_KEY);
    else sessionStorage.setItem(LAST_WEATHER_KEY, JSON.stringify(weather));
  } catch {
    // Private mode or a full store should not break the pill.
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function LocationPillLabel({ weather }: { weather: LocationWeather | null }) {
  return (
    <>
      <span className="whitespace-nowrap">{weather?.location ?? "Lisbon"}</span>
      {weather?.temperature !== null && weather?.temperature !== undefined ? (
        <>
          <span aria-hidden="true" className="text-foreground/25">
            •
          </span>
          <span className="whitespace-nowrap tabular-nums">
            {weather.temperature}°C
          </span>
        </>
      ) : null}
    </>
  );
}

export default function LocationPill({ weather }: LocationPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localTime, setLocalTime] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [current, setCurrent] = useState(weather);
  const [outgoing, setOutgoing] = useState<LocationWeather | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const previous = readLastWeather();
    writeLastWeather(weather);

    const from =
      previous && locationWeatherChanged(previous, weather) ? previous : null;

    if (!from || prefersReducedMotion()) {
      setCurrent(weather);
      setOutgoing(null);
      return;
    }

    setCurrent(from);
    setOutgoing(null);

    const frame = window.requestAnimationFrame(() => {
      setOutgoing(from);
      setCurrent(weather);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [weather]);

  useEffect(() => {
    if (!outgoing) return;
    const timeout = window.setTimeout(() => setOutgoing(null), SWAP_MS);
    return () => window.clearTimeout(timeout);
  }, [outgoing]);

  useEffect(() => {
    const updateLocalTime = () => {
      setLocalTime(formatLocalTime(current?.timeZone ?? null));
    };

    updateLocalTime();
    const interval = window.setInterval(updateLocalTime, 30_000);

    return () => window.clearInterval(interval);
  }, [current?.timeZone]);

  useEffect(() => {
    setIsStale(isLocationStale(current?.updatedAt ?? null, new Date()));
  }, [current?.updatedAt]);

  const updatedDate = current?.updatedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
      }).format(Date.parse(current.updatedAt))
    : null;
  const weatherDescription =
    current?.condition && current.temperature !== null
      ? `${current.condition.toLowerCase()} at ${current.temperature}°C`
      : null;

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <span
        aria-label="Current location and weather"
        className="inline-flex h-6 items-center gap-1 rounded-full bg-surface pl-2.5 pr-0.5 text-[0.625rem] tracking-[-0.01em] text-muted"
      >
        <span className="relative inline-grid grid-flow-col items-center">
          {outgoing ? (
            <span
              aria-hidden="true"
              className="location-swap-out col-start-1 row-start-1 inline-flex items-center gap-1"
            >
              <LocationPillLabel weather={outgoing} />
            </span>
          ) : null}
          <span
            className={`col-start-1 row-start-1 inline-flex items-center gap-1 ${
              outgoing ? "location-swap-in" : ""
            }`}
          >
            <LocationPillLabel weather={current} />
          </span>
        </span>
        <button
          ref={buttonRef}
          aria-controls="location-details"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`About the weather in ${current?.location ?? "Lisbon"}`}
          className="relative grid size-5 shrink-0 place-items-center rounded-full text-muted/55 transition-[background-color,color,transform] duration-150 hover:bg-background/70 hover:text-foreground active:scale-[0.94] motion-reduce:transition-none after:absolute after:-inset-3 after:content-['']"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <InfoIcon />
        </button>
      </span>

      <span
        id="location-details"
        aria-label={`${current?.location ?? "Lisbon"} weather details`}
        aria-hidden={!isOpen}
        className={`absolute left-0 right-auto top-[calc(100%+0.5rem)] z-40 w-64 max-w-[calc(100vw-2rem)] origin-top-left rounded-xl border border-border bg-background px-3.5 py-3 text-left text-xs leading-relaxed text-muted shadow-lg transition-[opacity,transform] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none sm:left-auto sm:right-0 sm:origin-top-right ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.97] opacity-0"
        }`}
        role="dialog"
      >
        <span className="block text-foreground">
          {current?.isHomeBase
            ? "My home base is Lisbon."
            : isStale
              ? `My last known location is ${current?.location ?? "Lisbon"}, updated ${updatedDate}.`
              : `I’m currently in ${current?.location ?? "Lisbon"}.`}{" "}
          {localTime && weatherDescription
            ? `Here, it’s ${localTime}, and the weather is ${weatherDescription}.`
            : localTime
              ? `Here, it’s ${localTime}, though the current weather is unavailable.`
              : "The current local time and weather are unavailable."}{" "}
          Weather data comes from{" "}
          <a
            className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
            href="https://open-meteo.com/"
            rel="noreferrer"
            tabIndex={isOpen ? 0 : -1}
            target="_blank"
          >
            Open-Meteo
          </a>
          .
        </span>
      </span>
    </span>
  );
}
