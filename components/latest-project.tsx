import type { ReactNode } from "react";

interface LatestUpdateProps {
  title?: string;
  projectName: string;
  description: string;
  timeAgo: string;
  icon?: ReactNode;
}

export default function LatestUpdate({
  title = "Latest update",
  projectName,
  description,
  timeAgo,
  icon,
}: LatestUpdateProps) {
  const defaultIcon = (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full text-accent"
      role="img"
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="30"
        className="fill-accent/10 stroke-accent/30"
        strokeWidth="2"
      />
      <path
        d="M23 18L13 26L23 34"
        className="fill-none stroke-foreground"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M41 18L51 26L41 34"
        className="fill-none stroke-foreground"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 16L30 48"
        className="fill-none stroke-accent motion-safe:animate-pulse motion-reduce:animate-none"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ animationDuration: "1.2s" }}
      />
      <circle
        cx="32"
        cy="32"
        r="5"
        className="fill-accent/80 motion-safe:animate-pulse motion-reduce:animate-none"
        style={{ animationDuration: "1.2s" }}
      />
    </svg>
  );

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>
      <hr className="border-border mb-4" />
      <div className="flex items-start gap-4">
        <div className="h-24 w-24 flex items-center justify-center">
          {icon || defaultIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground mb-1">{projectName}</div>
          <div className="text-sm text-muted mb-1">{description}</div>
          <div className="text-sm text-muted">{timeAgo}</div>
        </div>
      </div>
      <hr className="border-border mt-4" />
    </div>
  );
}
