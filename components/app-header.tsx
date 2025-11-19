import Link from "next/link";
import { Suspense } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Search } from "./search";

export function Header() {
  return (
    <header
      className={`
        flex items-center justify-between mb-12 tracking-tight
        fixed top-0 left-0 right-0 z-50
        max-w-4xl mx-auto px-4 sm:px-8 py-3
        sm:pb-12
        bg-gradient-to-b from-background via-background to-background/0
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
            <Suspense fallback={<div className="w-9 h-9" />}>
              <Search />
            </Suspense>
          </li>
          <li>
            <Link href="/about" className="hover:text-accent transition-colors">
              About
            </Link>
          </li>
          <li>
            <a
              href="https://twitter.com/hugodemenez"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Twitter
            </a>
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </nav>
    </header>
  );
}
