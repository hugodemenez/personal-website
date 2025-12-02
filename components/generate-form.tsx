"use client";

import { useRef, FormEvent, useState, KeyboardEvent, useEffect } from "react";
import { CornerDownLeft, Loader2 } from "lucide-react";

interface GenerateFormProps {
  onGenerate: (prompt: string, pages: string[]) => void;
  isLoading: boolean;
  error: Error | null;
}

interface ContextUrl {
  id: string;
  url: string;
}

function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${url}&sz=32`;
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    // If it doesn't have a protocol, try adding https://
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      try {
        const urlObj = new URL(`https://${url}`);
        return urlObj.href;
      } catch {
        return url;
      }
    }
    return url;
  }
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function GenerateForm({
  onGenerate,
  isLoading,
  error,
}: GenerateFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const contextInputRef = useRef<HTMLInputElement>(null);
  const [contextUrls, setContextUrls] = useState<ContextUrl[]>([]);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [contextInputValue, setContextInputValue] = useState("");
  const [newlyAddedTabId, setNewlyAddedTabId] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Don't submit if we're adding a context URL
    if (isAddingUrl) {
      return;
    }
    if (inputRef.current?.value.trim()) {
      const pages = contextUrls.map((item) => item.url);
      onGenerate(inputRef.current.value, pages);
      inputRef.current.value = "";
      setContextUrls([]);
      setContextInputValue("");
      setIsAddingUrl(false);
    }
  };

  const handleAddContextUrl = (url: string, keepInputOpen: boolean = false) => {
    const normalizedUrl = normalizeUrl(url.trim());
    if (!isValidUrl(normalizedUrl)) {
      return;
    }

    // Check if we've reached the max limit
    if (contextUrls.length >= 3) {
      setContextInputValue("");
      setIsAddingUrl(false);
      return;
    }

    // Check if URL already exists
    if (contextUrls.some((item) => item.url === normalizedUrl)) {
      setContextInputValue("");
      if (!keepInputOpen) {
        setIsAddingUrl(false);
      }
      return;
    }

    const newUrl: ContextUrl = {
      id: generateUUID(),
      url: normalizedUrl,
    };

    setNewlyAddedTabId(newUrl.id);
    setContextUrls([...contextUrls, newUrl]);
    setContextInputValue("");
    
    if (!keepInputOpen || contextUrls.length + 1 >= 3) {
      setIsAddingUrl(false);
    } else {
      // Keep input focused for next URL
      setTimeout(() => {
        contextInputRef.current?.focus();
      }, 0);
    }

    // Clear the animation flag after animation completes
    setTimeout(() => {
      setNewlyAddedTabId(null);
    }, 250);
  };

  const handleContextInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (contextInputValue.trim()) {
        handleAddContextUrl(contextInputValue, true);
      } else {
        setIsAddingUrl(false);
        setContextInputValue("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsAddingUrl(false);
      setContextInputValue("");
      contextInputRef.current?.blur();
    }
  };

  const handleContextInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText.trim() && isValidUrl(normalizeUrl(pastedText))) {
      e.preventDefault();
      handleAddContextUrl(pastedText);
    }
  };

  const handleRemoveContextUrl = (id: string) => {
    setContextUrls(contextUrls.filter((item) => item.id !== id));
  };

  const handleStartAddingUrl = () => {
    // Don't allow adding if we've reached the max limit
    if (contextUrls.length >= 3) {
      return;
    }
    setIsAddingUrl(true);
    setTimeout(() => {
      contextInputRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    if (isAddingUrl && contextInputRef.current) {
      contextInputRef.current.focus();
    }
  }, [isAddingUrl]);

  return (
    <div className="">
      <p className="text-muted mb-4 text-sm">
        This content is fully AI generated. Try it by yourself!
      </p>
      <form
        onSubmit={handleSubmit}
        className="w-full"
        aria-label="Generate AI content form"
      >
        <div className="flex flex-col gap-0">
          {/* Chrome-style URL Tabs */}
          <div className="flex items-end gap-0 pb-0 -mb-px overflow-hidden">
            {contextUrls.map((item, index) => (
              <div
                key={item.id}
                className={`group relative flex items-center gap-2 px-3 py-2 bg-surface border-l border-t border-r border-border rounded-t-lg shrink-0 ${
                  newlyAddedTabId === item.id ? "animate-tab-enter" : ""
                }`}
                style={{
                  marginLeft: index === 0 ? "0" : "-1px",
                  zIndex: contextUrls.length - index + (isAddingUrl ? 1 : 0),
                  transformOrigin: "left center",
                  flex: "0 1 auto",
                  maxWidth: "200px",
                }}
              >
                <img
                  src={getFaviconUrl(item.url)}
                  alt=""
                  className="w-4 h-4 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E";
                  }}
                />
                <span className="text-base md:text-xs text-foreground truncate min-w-0 flex-1">
                  {getDomainFromUrl(item.url)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveContextUrl(item.id)}
                  className="ml-1 text-muted hover:text-foreground transition-colors focus:outline-none opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0"
                  aria-label={`Remove ${item.url}`}
                  disabled={isLoading}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {isAddingUrl && contextUrls.length < 3 && (
              <div
                className="relative flex items-center gap-2 px-3 py-2 bg-surface border-l border-t border-r border-border rounded-t-lg shrink-0 animate-tab-enter"
                style={{
                  marginLeft: contextUrls.length > 0 ? "-1px" : "0",
                  zIndex: 0,
                  transformOrigin: "left center",
                  flex: "0 0 200px",
                }}
              >
                <input
                  ref={contextInputRef}
                  type="text"
                  value={contextInputValue}
                  onChange={(e) => setContextInputValue(e.target.value)}
                  onKeyDown={handleContextInputKeyDown}
                  onPaste={handleContextInputPaste}
                  onBlur={() => {
                    if (contextInputValue.trim()) {
                      handleAddContextUrl(contextInputValue);
                    } else {
                      setIsAddingUrl(false);
                    }
                  }}
                  placeholder="Enter URL"
                  className="flex-1 bg-transparent border-none outline-none text-base md:text-xs text-foreground placeholder:text-muted min-w-0"
                  disabled={isLoading}
                />
              </div>
            )}
            {contextUrls.length < 3 && (
              <button
                type="button"
                onClick={handleStartAddingUrl}
                className="flex items-center gap-2 justify-center px-3 py-2 bg-surface border-l border-t border-r border-border rounded-t-lg text-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background shrink-0"
                style={{
                  marginLeft: (contextUrls.length > 0 || isAddingUrl) ? "-1px" : "0",
                  zIndex: 0,
                  flex: "0 0 auto",
                }}
                disabled={isLoading || isAddingUrl}
                aria-label="Add context URL"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <p className="text-base md:text-xs text-muted">Add URL for context</p>
              </button>
            )}
          </div>

          {/* Main Input Container */}
          <label htmlFor="userInput" className="sr-only">
            Enter your name and social media handles
          </label>
          <div
            className="flex items-center pl-4 pr-6 py-2 bg-surface border border-border rounded-lg rounded-tl-none"
          >
            <input
              ref={inputRef}
              type="text"
              id="userInput"
              name="userInput"
              placeholder="What is your name?"
              className="flex-1 px-2 bg-surface border-none outline-none text-base text-foreground placeholder:text-muted py-2 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background rounded"
              autoComplete="name"
              aria-describedby="userInputHint"
              aria-required="true"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="ml-4 px-3 md:px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background flex items-center justify-center"
              aria-label="Generate my page"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden md:inline ml-2">Generating...</span>
                </>
              ) : (
                <>
                  <CornerDownLeft className="w-5 h-5" />
                  <span className="hidden md:inline ml-2">Generate my page</span>
                </>
              )}
            </button>
          </div>
          <p id="userInputHint" className="text-muted text-xs mt-2">
            *Hint: You can put sources to make sure AI finds you on the web
          </p>
        </div>
      </form>
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200"
        >
          An error occurred while generating content. Please try again.
        </div>
      )}
    </div>
  );
}


