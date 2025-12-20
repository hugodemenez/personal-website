"use client";

import { refreshGeneratedContent } from "@/server/refresh-generated-content";
import { useState } from "react";

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshGeneratedContent();
      // Force a full page reload to ensure cache is cleared
      window.location.reload();
    } catch (error) {
      console.error("Failed to refresh:", error);
      setIsRefreshing(false);
    }
  };

  const RefreshIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={isRefreshing ? "animate-spin" : ""}
    >
      <path
        d="M10 3V1M10 1L7 4M10 1L13 4M3 10C3 6.13401 6.13401 3 10 3M17 10C17 13.866 13.866 17 10 17M10 17V19M10 19L7 16M10 19L13 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="text-muted hover:text-accent transition-colors text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      aria-label="Refresh generated content"
    >
      <RefreshIcon />
      <span className="hidden md:inline">
        {isRefreshing ? "Refreshing..." : "Refresh now"}
      </span>
    </button>
  );
}
