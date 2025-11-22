"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useRef, useMemo } from "react";
import { Streamdown } from "streamdown";
import { mdxComponents } from "./mdx-components-list";
import {
  parseStreamContent,
  extractTextFromEvents,
  extractTextByStreamId,
  type ToolOutputAvailableEvent,
  type ErrorEvent,
} from "@/lib/stream-parser";
import { SourcesAccordion } from "./sources-accordion";
import { TextStreamsAccordion } from "./text-streams-accordion";
import { ToolFeedback } from "./tool-feedback";
import { GenerateForm } from "./generate-form";
import { processMarkdown } from "@/lib/markdown";

interface Source {
  type: string;
  sourceType: string;
  id: string;
  url: string;
}

interface TextStream {
  id: string;
  text: string;
}

interface ParsedStreamData {
  streams: TextStream[];
  toolFeedback: string | null;
  sources: Source[];
  error: string | null;
}

export function LandingContent() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/generate",
    streamProtocol: "text",
    onError: (err) => console.error("Completion error:", err),
  });

  // Single memo to parse the stream once and extract all needed data
  const parsedData = useMemo((): ParsedStreamData => {
    if (!completion) {
      return {
        streams: [],
        toolFeedback: null,
        sources: [],
        error: null,
      };
    }

    try {
      const events = parseStreamContent(completion);
      
      // Extract error events
      const errorEvents = events.filter(
        (e): e is ErrorEvent => e.type === "error"
      );
      const latestError = errorEvents[errorEvents.length - 1];
      const streamError = latestError?.errorText || null;

      // Extract text content by stream ID, keeping streams separate
      const textByStreamId = extractTextByStreamId(events);
      const streamIds = Array.from(textByStreamId.keys());
      const streams: TextStream[] = streamIds
        .map((id) => {
          const rawText = textByStreamId.get(id) || "";
          if (!rawText) return null;
          const processedText = processMarkdown(rawText);
          return { id, text: processedText };
        })
        .filter((stream): stream is TextStream => stream !== null);

      // Extract preliminary tool feedback
      const preliminaryToolOutputs = events.filter(
        (e): e is ToolOutputAvailableEvent =>
          e.type === "tool-output-available" &&
          e.preliminary === true &&
          e.output &&
          typeof e.output === "object" &&
          "status" in e.output &&
          "text" in e.output
      );
      const latestPreliminary = preliminaryToolOutputs[preliminaryToolOutputs.length - 1];
      const toolFeedback =
        latestPreliminary &&
        latestPreliminary.output &&
        typeof latestPreliminary.output === "object"
          ? (latestPreliminary.output as { text?: string }).text || null
          : null;

      // Extract sources from finished tool outputs
      const finishedToolOutputs = events.filter(
        (e): e is ToolOutputAvailableEvent =>
          e.type === "tool-output-available" &&
          e.output &&
          typeof e.output === "object" &&
          "status" in e.output &&
          e.output.status === "finished" &&
          "sources" in e.output &&
          Array.isArray(e.output.sources)
      );
      const latestFinished = finishedToolOutputs[finishedToolOutputs.length - 1];
      const sources =
        latestFinished &&
        latestFinished.output &&
        typeof latestFinished.output === "object"
          ? (latestFinished.output as { sources?: Source[] }).sources || []
          : [];

      return {
        streams,
        toolFeedback,
        sources,
        error: streamError,
      };
    } catch (error) {
      console.error("Failed to parse completion:", error);
      return {
        streams: [],
        toolFeedback: null,
        sources: [],
        error: error instanceof Error ? error.message : "Failed to parse stream",
      };
    }
  }, [completion]);

  useEffect(() => {
    if (completion) {
      console.log("Parsed data:", parsedData);
      console.log("Completion:", completion);
    }
  }, [completion, parsedData]);

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const hugoPrompt = "Hugo Demenez" +
      "Twitter/X handle: @hugodemenez" +
      "GitHub handle: hugodemenez" +
      "LinkedIn handle: hugodemenez" +
      "Substack handle: hugodemenez";
      complete(hugoPrompt);
    }
  }, [complete]);

  // Combine stream errors with hook errors
  const displayError = parsedData.error || error?.message || null;

  return (
    <div className="mt-8">
      {!isLoading && <SourcesAccordion sources={parsedData.sources} />}

      {parsedData.toolFeedback && isLoading && (
        <ToolFeedback message={parsedData.toolFeedback} />
      )}

      {displayError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200"
        >
          <p className="font-medium mb-1">Error generating content</p>
          <p>{displayError}</p>
        </div>
      )}

      {/* Render accordion streams (xai-search, perplexity-search) */}
      {parsedData.streams.filter(
        (s) => s.id === "xai-search" || s.id === "perplexity-search"
      ).length > 0 && (
        <TextStreamsAccordion
          streams={parsedData.streams.filter(
            (s) => s.id === "xai-search" || s.id === "perplexity-search"
          )}
        />
      )}

      {/* Render direct streams (everything else) */}
      {parsedData.streams
        .filter((s) => s.id !== "xai-search" && s.id !== "perplexity-search")
        .map((stream) => (
          <div key={stream.id} className="mb-6">
            <Streamdown components={mdxComponents}>{stream.text}</Streamdown>
          </div>
        ))}

      {parsedData.streams.length > 0 && !isLoading && (
        <GenerateForm
          onGenerate={complete}
          isLoading={isLoading}
          error={displayError ? new Error(displayError) : null}
        />
      )}
    </div>
  );
}
