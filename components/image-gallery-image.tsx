"use client";

import { ComponentPropsWithoutRef, useEffect, useRef } from "react";
import Image from "next/image";
import { useImageGallery } from "./image-gallery-context";

interface ImageGalleryImageProps
  extends Omit<ComponentPropsWithoutRef<"img">, "width" | "height"> {
  src: string;
  alt?: string;
}

export function ImageGalleryImage({
  src,
  alt,
  ...props
}: ImageGalleryImageProps) {
  const { images, openGallery } = useImageGallery();
  const imageIndexRef = useRef<number>(-1);

  // Find the index of this image in the images array
  useEffect(() => {
    if (imageIndexRef.current === -1) {
      const index = images.findIndex((img) => img.src === src);
      if (index !== -1) {
        imageIndexRef.current = index;
      }
    }
  }, [images, src]);

  const handleClick = () => {
    if (imageIndexRef.current !== -1) {
      openGallery(imageIndexRef.current);
    }
  };

  if (!src || typeof src !== "string") return null;

  const isExternal = src.startsWith("http");

  return (
    <span
      className="block relative w-full bg-surface my-4 overflow-hidden rounded-lg border border-border aspect-3/2 scale-105 cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Open image: ${alt || "Gallery image"}`}
    >
      <Image
        src={src}
        alt={typeof alt === "string" ? alt : ""}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 90vw, 700px"
        loading="lazy"
        unoptimized={isExternal}
        {...props}
      />
    </span>
  );
}

