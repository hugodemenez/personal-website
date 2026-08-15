"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface DrawReplayValue {
  replay: () => void;
  token: number;
}

const DrawReplayContext = createContext<DrawReplayValue | null>(null);

export function DrawReplay({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(0);
  const value = useMemo(
    () => ({
      replay: () => setToken((current) => current + 1),
      token,
    }),
    [token]
  );

  return (
    <DrawReplayContext.Provider value={value}>
      {children}
    </DrawReplayContext.Provider>
  );
}

export function useDrawReplayToken(): number {
  return useContext(DrawReplayContext)?.token ?? 0;
}

function ReplayIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M3.2 8a4.8 4.8 0 1 0 1.35-3.32"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
      <path
        d="M3.2 2.85v3.15h3.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function ReplayButton({ label }: { label: string }) {
  const replay = useContext(DrawReplayContext)?.replay;
  if (!replay) return null;

  return (
    <button
      aria-label={label}
      className="relative inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full py-1 text-sm tracking-[-0.01em] text-muted/70 transition-[color,transform] duration-150 hover:text-foreground focus-visible:text-foreground active:scale-[0.98] motion-reduce:hidden after:absolute after:-inset-3 after:content-['']"
      onClick={replay}
      title={label}
      type="button"
    >
      <ReplayIcon />
      <span>animation</span>
    </button>
  );
}
