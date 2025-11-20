"use client";

import { useState } from "react";

interface Source {
  type: string;
  sourceType: string;
  id: string;
  url: string;
}

interface SourcesAccordionProps {
  sources: Source[];
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${url}&sz=32`;
  }
}

export function SourcesAccordion({ sources }: SourcesAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors"
        aria-expanded={isOpen}
        aria-controls="sources-content"
      >
        <span className="text-sm font-medium text-foreground">
          Sources ({sources.length})
        </span>
        <svg
          className={`w-5 h-5 text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          id="sources-content"
          className="mt-2 border border-border rounded-lg bg-background overflow-hidden"
        >
          <ul className="divide-y divide-border">
            {sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 hover:bg-surface transition-colors"
                >
                  <img
                    src={getFaviconUrl(source.url)}
                    alt=""
                    className="w-4 h-4 flex-shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E";
                    }}
                  />
                  <span className="text-sm text-foreground truncate flex-1">
                    {source.url}
                  </span>
                  <svg
                    className="w-4 h-4 text-muted flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

