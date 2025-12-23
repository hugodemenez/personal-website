import { ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tweet } from "./tweet/Tweet";

export const mdxComponents = {
  Tweet: ({ id }: { id: string }) => <Tweet id={id} />,
  h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="text-4xl font-bold mt-8 mb-4 text-foreground" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-3xl font-semibold mt-6 mb-3 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-2xl font-semibold mt-4 mb-2 text-foreground" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }: ComponentPropsWithoutRef<"p">) => (
    <p className="mb-4 leading-relaxed text-muted" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc pl-6 mb-4 space-y-2 text-muted" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2 text-muted" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: ComponentPropsWithoutRef<"li">) => (
    <li className="pl-1 marker:text-muted" {...props}>
      {children}
    </li>
  ),
  code: ({ children, ...props }: ComponentPropsWithoutRef<"code">) => (
    <code
      className="bg-surface px-1.5 py-0.5 rounded text-sm font-mono text-accent"
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, ...props }: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="bg-surface p-4 rounded-lg overflow-x-auto mb-4 border border-border"
      {...props}
    >
      {children}
    </pre>
  ),
  blockquote: ({
    children,
    ...props
  }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="border-l-4 border-accent pl-4 italic my-4 text-muted"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
    const isExternal = href?.startsWith("http");
    return (
      <Link
        href={href || "#"}
        className="text-accent hover:text-accent-light hover:underline transition-colors"
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </Link>
    );
  },
  img: ({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) => {
    if (!src || typeof src !== "string") return null;

    const isExternal = src.startsWith("http");

    return (
      <span className="block relative w-full bg-surface my-4 overflow-hidden rounded-lg border border-border aspect-3/2 scale-105">
          <Image
            src={src}
            alt={typeof alt === "string" ? alt : ""}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 90vw, 700px"
            loading="lazy"
            unoptimized={isExternal}
          />
      </span>
    );
  },
};
