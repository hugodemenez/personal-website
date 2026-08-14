import Image from "next/image";
import Link from "next/link";
import { getStampPose, type StampAlign } from "@/lib/stamp-pose";

interface PostStampProps {
  src: string;
  seed: string;
  alt?: string;
  href?: string;
  sizes?: string;
  variant?: "collectible" | "feature" | "album";
  /** Hide the link from assistive tech when a title already points here. */
  decorative?: boolean;
  external?: boolean;
}

const ALIGN_CLASS: Record<StampAlign, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

export function PostStamp({
  src,
  seed,
  alt = "",
  href,
  sizes = "(max-width: 768px) 92vw, 700px",
  variant = "collectible",
  decorative = false,
  external = false,
}: PostStampProps) {
  const pose = getStampPose(seed, variant === "album" ? "collectible" : variant);
  const isExternal = src.startsWith("http");
  const album = variant === "album";
  const collectible = variant === "collectible";

  const picture = (
    <span
      className={`stamp-paper block w-full ${album ? "stamp-paper-album" : ""}`}
      style={{
        ["--stamp-pitch" as string]: album
          ? `${Math.max(6.5, pose.pitch * 0.58)}px`
          : `${pose.pitch}px`,
        transform: album
          ? undefined
          : `rotate(${pose.rotate}deg) translate(${pose.shiftX}px, ${pose.shiftY}px)`,
      }}
    >
      <span
        className={
          collectible || album
            ? "stamp-window relative block aspect-3/2 w-full overflow-hidden"
            : "stamp-window relative block overflow-hidden"
        }
      >
        {collectible || album ? (
          <Image
            alt={alt}
            className="object-cover"
            fill
            sizes={sizes}
            src={src}
            unoptimized={isExternal}
          />
        ) : (
          <Image
            alt={alt}
            className="h-auto w-full"
            height={400}
            sizes={sizes}
            src={src}
            unoptimized={isExternal}
            width={700}
          />
        )}
      </span>
    </span>
  );

  const body = href ? (
    <Link
      aria-hidden={decorative ? true : undefined}
      className="stamp-shadow block w-full"
      href={href}
      rel={external ? "noopener noreferrer" : undefined}
      tabIndex={decorative ? -1 : undefined}
      target={external ? "_blank" : undefined}
    >
      {picture}
    </Link>
  ) : (
    <span className="stamp-shadow block w-full">{picture}</span>
  );

  if (album) {
    return body;
  }

  return (
    <span
      className={`flex ${ALIGN_CLASS[pose.align]}`}
      style={{ width: "100%" }}
    >
      <span className="block" style={{ width: `${pose.width * 100}%` }}>
        {body}
      </span>
    </span>
  );
}
