"use client";

import { useEffect, useRef, useState } from "react";
import type { LocationWeather } from "@/server/location";

interface WeatherPillProps {
  weather: LocationWeather | null;
}

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 7.1v3.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" />
      <circle cx="8" cy="5.15" r=".7" fill="currentColor" />
    </svg>
  );
}

export default function WeatherPill({ weather }: WeatherPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localTime, setLocalTime] = useState(weather?.time ?? "local time");
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateLocalTime = () => {
      setLocalTime(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Europe/Lisbon",
        }).format(new Date())
      );
    };

    updateLocalTime();
    const interval = window.setInterval(updateLocalTime, 30_000);

    return () => window.clearInterval(interval);
  }, []);

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
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface py-1 pl-3 pr-1 text-xs tracking-[-0.01em] text-muted"
      >
        <span className="whitespace-nowrap">{weather?.location ?? "Lisbon"}</span>
        {weather ? (
          <>
            <span aria-hidden="true" className="text-foreground/25">
              •
            </span>
            <span className="whitespace-nowrap tabular-nums">
              {weather.temperature}°C
            </span>
          </>
        ) : null}
        <button
          ref={buttonRef}
          aria-controls="weather-details"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="About the Lisbon weather"
          className="relative grid size-6 shrink-0 place-items-center rounded-full text-muted/55 transition-[background-color,color,transform] duration-150 hover:bg-background/70 hover:text-foreground active:scale-[0.94] motion-reduce:transition-none after:absolute after:-inset-2 after:content-['']"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <InfoIcon />
        </button>
      </span>

      <span
        id="weather-details"
        aria-label="Lisbon weather details"
        aria-hidden={!isOpen}
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-border bg-background px-3.5 py-3 text-left text-xs leading-relaxed text-muted shadow-lg transition-[opacity,transform] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.97] opacity-0"
        }`}
        role="dialog"
      >
        <span className="block text-foreground">
          I am currently based in Lisbon. Here, it’s {localTime}
          {weather
            ? `, and the weather is ${weather.condition.toLowerCase()} at ${weather.temperature}°C`
            : ", though the current weather is unavailable"}
          . The data comes from{" "}
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
