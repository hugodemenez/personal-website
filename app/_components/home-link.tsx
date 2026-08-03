"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";

/**
 * "Home" navigates home from anywhere else, but scrolls back to the top when
 * you are already there — otherwise the link is a no-op on the page it points at.
 */
export function HomeLink() {
  const pathname = usePathname();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/") return;

    event.preventDefault();

    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      behavior: shouldReduceMotion || event.detail === 0 ? "auto" : "smooth",
      top: 0,
    });
  };

  return (
    <Link
      className="font-medium text-foreground transition-colors hover:text-accent"
      href="/"
      onClick={handleClick}
    >
      Home
    </Link>
  );
}
