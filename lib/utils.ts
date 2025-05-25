import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Simple utility for conditional classNames merging
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 