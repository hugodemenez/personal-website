import type { ReactNode } from "react";

interface PublicProjectProps {
  title?: string;
  projectName: string;
  description: string;
  date: string;
  meta?: string;
  icon?: ReactNode;
}

export default function PublicProject({
  title = "Public project",
  projectName,
  description,
  date,
  meta,
  icon,
}: PublicProjectProps) {
  const defaultIcon = (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full text-accent"
      role="img"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="16"
        width="48"
        height="36"
        rx="6"
        className="fill-accent/10 stroke-accent/30"
        strokeWidth="2"
      />
      <path
        d="M22 28H42"
        className="stroke-foreground"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 36H36"
        className="stroke-foreground"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="22"
        r="4"
        className="fill-accent motion-safe:animate-pulse motion-reduce:animate-none"
        style={{ animationDuration: "1.1s" }}
      />
    </svg>
  );

  return (
    <section className="w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {meta ? <span className="text-sm text-muted">{meta}</span> : null}
      </div>
      <hr className="border-border mb-4" />
      <div className="flex items-start gap-4">
        <div className="h-24 w-24 flex items-center justify-center">
          {icon || defaultIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="font-bold text-foreground leading-tight">
              {projectName}
            </div>
            <div className="text-sm text-muted whitespace-nowrap">{date}</div>
          </div>
          <p className="text-sm text-muted mb-2">{description}</p>
        </div>
      </div>
      <hr className="border-border mt-4" />
    </section>
  );
}


