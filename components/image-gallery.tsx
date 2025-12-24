"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ImageData {
  src: string;
  alt: string;
  element: HTMLImageElement;
}

export function ImageGallery() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Scan DOM for images and make them clickable
  useEffect(() => {
    const scanImages = () => {
      const article = document.querySelector("article");
      if (!article) return;

      const imgElements = Array.from(article.querySelectorAll("img"));
      const imageData: ImageData[] = [];
      const cleanup: Array<() => void> = [];

      imgElements.forEach((img) => {
        const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
        const alt = img.getAttribute("alt") || "";

        if (src && !img.closest("dialog")) {
          const wrapper = img.closest("span");
          if (wrapper) {
            wrapper.style.cursor = "pointer";
            wrapper.setAttribute("role", "button");
            wrapper.setAttribute("tabindex", "0");
            wrapper.setAttribute("aria-label", `Open image: ${alt || "Gallery image"}`);

            const handleClick = () => {
              const index = imageData.findIndex((imgData) => imgData.element === img);
              if (index !== -1) {
                setCurrentIndex(index);
                setIsOpen(true);
              }
            };

            const handleKeyDown = (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            };

            wrapper.addEventListener("click", handleClick);
            wrapper.addEventListener("keydown", handleKeyDown);
            cleanup.push(() => {
              wrapper.removeEventListener("click", handleClick);
              wrapper.removeEventListener("keydown", handleKeyDown);
            });

            imageData.push({ src, alt, element: img as HTMLImageElement });
          }
        }
      });

      setImages(imageData);
      return () => cleanup.forEach((fn) => fn());
    };

    // Wait a bit for React to render the article
    const timeout = setTimeout(scanImages, 100);
    return () => clearTimeout(timeout);
  }, []);

  // Open/close dialog and prevent body scroll
  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < images.length - 1) {
        e.preventDefault();
        setCurrentIndex(currentIndex + 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === images.length - 1;

  const handleClose = () => setIsOpen(false);
  const handleNext = () => setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1));
  const handlePrevious = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));

  // Get image file for sharing/download
  const getImageFile = async (): Promise<File | null> => {
    const imgElement = currentImage.element;
    if (!imgElement) return null;

    try {
      // Try to use the rendered image element
      if (imgElement.complete && imgElement.naturalWidth > 0) {
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
      }
    } catch (e) {
      // Canvas tainted by CORS, try fetch
    }

    // Fallback: fetch via proxy for external images
    const imageUrl = currentImage.src.startsWith("http")
      ? currentImage.src
      : `${window.location.origin}${currentImage.src}`;

    const isExternal = imageUrl.startsWith("http") && !imageUrl.startsWith(window.location.origin);
    const fetchUrl = isExternal
      ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new File([blob], `image-${currentIndex + 1}.jpg`, {
        type: blob.type || "image/jpeg",
      });
    } catch (error) {
      console.error("Failed to fetch image:", error);
      return null;
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const file = await getImageFile();
      if (navigator.share && file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: currentImage.alt || "Image",
        });
      } else if (navigator.share) {
        const imageUrl = currentImage.src.startsWith("http")
          ? currentImage.src
          : `${window.location.origin}${currentImage.src}`;
        await navigator.share({
          title: currentImage.alt || "Image",
          url: imageUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        const imageUrl = currentImage.src.startsWith("http")
          ? currentImage.src
          : `${window.location.origin}${currentImage.src}`;
        await navigator.clipboard.writeText(imageUrl);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const file = await getImageFile();

      if (isMobile && navigator.share && file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Save Image",
        });
      } else if (file) {
        const url = window.URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = `image-${currentIndex + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const imageUrl = currentImage.src.startsWith("http")
          ? currentImage.src
          : `${window.location.origin}${currentImage.src}`;
        window.open(imageUrl, "_blank");
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // If click is directly on the dialog element (backdrop), close it
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If click is on the outer container (backdrop area), close the dialog
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const isExternal = currentImage.src.startsWith("http");

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 box-border h-full w-full max-h-none max-w-none overflow-hidden border-0 bg-background p-0 transition-opacity"
      onClose={handleClose}
      onClick={handleDialogClick}
      onCancel={handleClose}
    >
      <div 
        className="relative h-full w-full flex items-center justify-center p-2 md:p-8"
        onClick={handleContentClick}
      >
        {/* Top controls - Share, Download, Close */}
        <div 
          className="absolute top-2 right-2 md:top-4 md:right-4 z-10 flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-2 text-muted hover:text-foreground transition-colors duration-200 ease rounded focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 text-muted hover:text-foreground transition-colors duration-200 ease rounded focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </button>

          <button
            onClick={handleClose}
            className="p-2 text-muted hover:text-foreground transition-colors duration-200 ease rounded focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            style={{ touchAction: "manipulation" }}
            aria-label="Close gallery"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Image container */}
        <div 
          className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center px-2 md:px-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-full h-full bg-surface rounded-lg md:border border-border overflow-hidden">
            <Image
              src={currentImage.src}
              alt={currentImage.alt || "Gallery image"}
              fill
              className="object-contain p-2 md:p-4"
              sizes="100vw"
              priority
              unoptimized={isExternal}
            />

            {/* Bottom controls - Previous, Counter, Next */}
            <div 
              className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Previous button */}
              <button
                onClick={handlePrevious}
                disabled={isFirst}
                className="p-2 text-muted hover:text-foreground transition-colors duration-200 ease rounded focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {images.length > 1 && (
                <div className="px-4 py-2 rounded bg-surface text-sm text-muted">
                  {currentIndex + 1} / {images.length}
                </div>
              )}

              {/* Next button */}
              <button
                onClick={handleNext}
                disabled={isLast}
                className="p-2 text-muted hover:text-foreground transition-colors duration-200 ease rounded focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </div>
    </dialog>
  );
}

