import Link from "next/link";
import { Suspense } from "react";
import { Search } from "./search";

export function Header() {
  return (
    <header
      className={`
        flex items-center justify-between tracking-tight
        fixed top-0 left-0 right-0 z-1 
        max-w-4xl mx-auto px-4 sm:px-8 pt-3
        pb-8 sm:pb-12
        bg-linear-to-b from-background via-background to-background/0
      `}
    >
      <Link
        href="/"
        className="font-medium text-foreground hover:text-accent transition-colors"
      >
        Home
      </Link>
      <nav>
        <ul className="flex items-center gap-6 text-muted">
          <li>
            <Suspense
              fallback={
                <button
                  disabled
                  className="p-2 text-muted hover:text-accent transition-colors"
                  aria-label="Search posts"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              }
            >
              <Search />
            </Suspense>
          </li>
        </ul>
      </nav>
    </header>
  );
}
