"use client";

import { useState } from "react";
import { Streamdown } from "streamdown";
import { mdxComponents } from "./mdx-components-list";

interface TextStreamsAccordionProps {
  streams: Array<{ id: string; text: string }>;
}

export function TextStreamsAccordion({ streams }: TextStreamsAccordionProps) {
  const [openStreamIds, setOpenStreamIds] = useState<Set<string>>(new Set());

  if (streams.length === 0) return null;

  const toggleStream = (streamId: string) => {
    setOpenStreamIds((prev) => {
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
      } else {
        next.add(streamId);
      }
      return next;
    });
  };

  const getStreamLabel = (streamId: string, index: number): string => {
    // Use a more readable label based on the stream ID
    if (streamId === "xai-search") {
      return "XAI Search Results";
    }
    if (streamId === "perplexity-search") {
      return "Perplexity Search Results";
    }
    if (streamId === "0" || streamId.startsWith("text-")) {
      return `Stream ${index + 1}`;
    }
    return `Stream ${streamId}`;
  };

  const getPreview = (text: string, maxLength: number = 100): string => {
    const plainText = text.replace(/[#*_`\[\]()]/g, "").trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.slice(0, maxLength) + "...";
  };

  return (
    <div className="space-y-2">
      {streams.map((stream, index) => {
        const isOpen = openStreamIds.has(stream.id);
        const preview = getPreview(stream.text);

        return (
          <div key={stream.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleStream(stream.id)}
              className="w-full flex items-center justify-between p-4 bg-surface hover:bg-surface/80 transition-colors duration-200 ease"
              aria-expanded={isOpen}
              aria-controls={`stream-content-${stream.id}`}
            >
              <div className="flex-1 text-left">
                <span className="text-sm font-medium text-foreground block">
                  {getStreamLabel(stream.id, index)}
                </span>
                {!isOpen && preview && (
                  <span className="text-xs text-muted mt-1 block truncate">
                    {preview}
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-muted flex-shrink-0 ml-4 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                style={{
                  transitionTimingFunction: "cubic-bezier(.215, .61, .355, 1)",
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isOpen && (
              <div
                id={`stream-content-${stream.id}`}
                className="p-4 bg-background border-t border-border"
                style={{
                  animation: "fadeIn 0.2s cubic-bezier(.215, .61, .355, 1) forwards",
                }}
              >
                <Streamdown components={mdxComponents}>{stream.text}</Streamdown>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

