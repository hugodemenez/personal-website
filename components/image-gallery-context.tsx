"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ImageData {
  src: string;
  alt: string;
}

interface ImageGalleryContextType {
  images: ImageData[];
  currentIndex: number;
  isOpen: boolean;
  openGallery: (index: number) => void;
  closeGallery: () => void;
  nextImage: () => void;
  previousImage: () => void;
}

const ImageGalleryContext = createContext<ImageGalleryContextType | undefined>(
  undefined
);

export function useImageGallery() {
  const context = useContext(ImageGalleryContext);
  if (!context) {
    throw new Error("useImageGallery must be used within ImageGalleryProvider");
  }
  return context;
}

interface ImageGalleryProviderProps {
  images: ImageData[];
  children: ReactNode;
}

export function ImageGalleryProvider({
  images,
  children,
}: ImageGalleryProviderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openGallery = useCallback(
    (index: number) => {
      if (index >= 0 && index < images.length) {
        setCurrentIndex(index);
        setIsOpen(true);
      }
    },
    [images.length]
  );

  const closeGallery = useCallback(() => {
    setIsOpen(false);
  }, []);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const previousImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  return (
    <ImageGalleryContext.Provider
      value={{
        images,
        currentIndex,
        isOpen,
        openGallery,
        closeGallery,
        nextImage,
        previousImage,
      }}
    >
      {children}
    </ImageGalleryContext.Provider>
  );
}

