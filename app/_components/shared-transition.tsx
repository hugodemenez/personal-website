import {} from "react/canary";
import { ViewTransition, type ReactNode } from "react";

interface SharedTransitionProps {
  children: ReactNode;
  /** Omit to render children without a shared-element name. */
  name?: string;
}

/**
 * Named pair for a title or stamp that should morph across the home list and
 * the post page. `default="none"` keeps unrelated transitions from animating
 * every named node; `share="morph"` is required for the pair to still run.
 */
export function SharedTransition({ children, name }: SharedTransitionProps) {
  if (!name) return children;

  return (
    <ViewTransition default="none" name={name} share="morph">
      {children}
    </ViewTransition>
  );
}
