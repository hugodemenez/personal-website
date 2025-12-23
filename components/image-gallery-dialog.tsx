"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useImageGallery } from "./image-gallery-context";

export function ImageGalleryDialog() {
  const {
    images,
    currentIndex,
    isOpen,
    closeGallery,
    nextImage,
    previousImage,
  } = useImageGallery();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const currentImage = images[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === images.length - 1;

  // Open/close dialog based on isOpen state and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      // Prevent body scroll
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      document.body.style.visibility = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.visibility = "";
      };
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        previousImage();
      } else if (e.key === "ArrowRight" && !isLast) {
        e.preventDefault();
        nextImage();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeGallery();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFirst, isLast, nextImage, previousImage, closeGallery]);

  // Handle backdrop clicks - close when clicking overlay
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Close if clicking directly on the dialog (overlay)
    if (e.target === dialogRef.current) {
      closeGallery();
    }
  };

  // Handle escape key (native dialog)
  const handleCancel = () => {
    closeGallery();
  };

  // Fetch image as blob (handles CORS via proxy if needed)
  const fetchImageBlob = async (imageUrl: string): Promise<Blob | null> => {
    // For external images, use our proxy API to avoid CORS
    const isExternal = imageUrl.startsWith("http") && 
      !imageUrl.startsWith(window.location.origin);
    
    const fetchUrl = isExternal 
      ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Fetch failed");
      return await response.blob();
    } catch (error) {
      console.error("Failed to fetch image:", error);
      return null;
    }
  };

  // Convert image to File for native sharing
  const getImageFile = async (): Promise<File | null> => {
    if (!currentImage) return null;

    const imageUrl = currentImage.src.startsWith("http")
      ? currentImage.src
      : `${window.location.origin}${currentImage.src}`;

    try {
      // First try: use the rendered image element (works for same-origin)
      const imgElement = imageContainerRef.current?.querySelector('img') as HTMLImageElement;
      
      if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = imgElement.naturalWidth;
          canvas.height = imgElement.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(imgElement, 0, 0);
            const blob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
            });
            if (blob) {
              return new File([blob], `image-${currentIndex + 1}.jpg`, {
                type: "image/jpeg",
              });
            }
          }
        } catch (e) {
          // Canvas tainted by CORS, fall through to fetch
        }
      }

      // Second try: fetch the image (uses proxy for external images)
      const blob = await fetchImageBlob(imageUrl);
      if (blob) {
        return new File([blob], `image-${currentIndex + 1}.jpg`, {
          type: blob.type || "image/jpeg",
        });
      }

      return null;
    } catch (error) {
      console.error("Failed to convert image to file:", error);
      return null;
    }
  };

  // Handle share - uses native Web Share API
  const handleShare = async () => {
    if (!currentImage) return;

    setIsSharing(true);
    try {
      const imageUrl = currentImage.src.startsWith("http")
        ? currentImage.src
        : `${window.location.origin}${currentImage.src}`;

      // Use native Web Share API
      if (navigator.share) {
        // Try to share as file (shows native share sheet with "Save Image" on iOS)
        const file = await getImageFile();
        
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: currentImage.alt || "Image",
            });
            return;
          } catch (shareError) {
            // User cancelled or error - fall through to URL sharing
            if (shareError instanceof Error && shareError.name === "AbortError") {
              return; // User cancelled, don't try URL sharing
            }
          }
        }

        // Fallback: share URL
        try {
          await navigator.share({
            title: currentImage.alt || "Image",
            text: currentImage.alt || "Check out this image",
            url: imageUrl,
          });
          return;
        } catch (shareError) {
          // User cancelled - that's okay
          if (shareError instanceof Error && shareError.name !== "AbortError") {
            throw shareError;
          }
        }
      }

      // Fallback: copy image URL to clipboard
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(imageUrl);
      }
    } catch (error) {
      // User cancelled or error occurred - silently fail
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle download - uses Web Share API on mobile (shows "Save Image" in share sheet)
  const handleDownload = async () => {
    if (!currentImage) return;

    setIsDownloading(true);
    try {
      const imageUrl = currentImage.src.startsWith("http")
        ? currentImage.src
        : `${window.location.origin}${currentImage.src}`;

      // Extract filename from URL or use a default
      const urlPath = new URL(imageUrl, window.location.origin).pathname;
      const filename = urlPath.split("/").pop() || `image-${currentIndex + 1}.jpg`;

      // Detect if we're on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // Get the image file
      const file = await getImageFile();
      
      // On mobile, always use Web Share API (shows native "Save Image" option)
      if (isMobile && navigator.share && file) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: currentImage.alt || "Save Image",
            });
            return;
          } catch (shareError) {
            // User cancelled - that's okay
            if (shareError instanceof Error && shareError.name === "AbortError") {
              return;
            }
            // Fall through to download approach
          }
        }
      }

      // Desktop or fallback: use download attribute
      if (file) {
        const url = window.URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Last resort: open image in new tab
        window.open(imageUrl, "_blank");
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!currentImage) return null;

  const isExternal = currentImage.src.startsWith("http");

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 box-border h-full w-full max-h-none max-w-none overflow-hidden border-0 bg-background/95 backdrop-blur-sm p-0 transition-opacity duration-200 ease-out"
      onClose={closeGallery}
      onClick={handleDialogClick}
      onCancel={handleCancel}
    >
      <div className="relative h-full w-full flex items-center justify-center p-2 md:p-8">
        {/* Close button - top right, just icon */}
        <button
          onClick={closeGallery}
          className="absolute top-2 right-2 md:top-4 md:right-4 z-20 p-2 text-muted hover:text-foreground transition-colors duration-200 ease focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          style={{ touchAction: "manipulation" }}
          aria-label="Close gallery"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Image container */}
        <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center px-2 md:px-0" onClick={(e) => e.stopPropagation()}>
          <div ref={imageContainerRef} className="relative w-full h-full bg-surface rounded-lg md:border border-border overflow-hidden">
            <Image
              src={currentImage.src}
              alt={currentImage.alt || "Gallery image"}
              fill
              className="object-contain p-2 md:p-4"
              sizes="100vw"
              priority
              unoptimized={isExternal}
            />
          </div>
        </div>

        {/* Grouped controls at bottom */}
        <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          {/* Navigation and counter group */}
          {images.length > 1 && (
            <div className="flex items-center gap-2">
              {/* Previous button - just arrow */}
              <button
                onClick={previousImage}
                disabled={isFirst}
                className="p-2 text-muted hover:text-foreground transition-colors duration-200 ease rounded-full bg-background/80 backdrop-blur-sm border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ touchAction: "manipulation" }}
                aria-label="Previous image"
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
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>

              {/* Image counter */}
              <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-background/80 backdrop-blur-sm border border-border text-xs md:text-sm text-muted">
                {currentIndex + 1} / {images.length}
              </div>

              {/* Next button - just arrow */}
              <button
                onClick={nextImage}
                disabled={isLast}
                className="p-2 text-muted hover:text-foreground transition-colors duration-200 ease rounded-full bg-background/80 backdrop-blur-sm border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ touchAction: "manipulation" }}
                aria-label="Next image"
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
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}

          {/* Share and Download buttons */}
          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center gap-2 p-3 md:px-4 md:py-2.5 text-muted hover:text-foreground transition-colors duration-200 ease rounded-full bg-background/80 backdrop-blur-sm border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: "manipulation" }}
              aria-label="Share image"
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
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span className="hidden md:inline text-sm">Share</span>
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 p-3 md:px-4 md:py-2.5 text-muted hover:text-foreground transition-colors duration-200 ease rounded-full bg-background/80 backdrop-blur-sm border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: "manipulation" }}
              aria-label="Download image"
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden md:inline text-sm">Download</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

