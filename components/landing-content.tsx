"use client";

import { useCompletion } from "@ai-sdk/react";
import { useEffect, useRef, useMemo } from "react";
import { Streamdown } from "streamdown";
import { mdxComponents } from "./mdx-components-list";
import {
  parseStreamContent,
  extractTextFromEvents,
  type ToolOutputAvailableEvent,
} from "@/lib/stream-parser";
import { SourcesAccordion } from "./sources-accordion";
import { ToolFeedback } from "./tool-feedback";
import { GenerateForm } from "./generate-form";

interface Source {
  type: string;
  sourceType: string;
  id: string;
  url: string;
}

interface ParsedStreamData {
  text: string | null;
  toolFeedback: string | null;
  sources: Source[];
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
        text: null,
        toolFeedback: null,
        sources: [],
      };
    }

    try {
      const events = parseStreamContent(completion);
      
      // Extract text content
      const text = extractTextFromEvents(events) || null;

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
        text,
        toolFeedback,
        sources,
      };
    } catch (error) {
      console.error("Failed to parse completion:", error);
      return {
        text: null,
        toolFeedback: null,
        sources: [],
      };
    }
  }, [completion]);

  useEffect(() => {
    if (completion) {
      console.log("Parsed data:", parsedData);
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

  return (
    <div className="mt-8">
      {!isLoading && <SourcesAccordion sources={parsedData.sources} />}

      {parsedData.toolFeedback && isLoading && (
        <ToolFeedback message={parsedData.toolFeedback} />
      )}

      {parsedData.text && (
        <Streamdown components={mdxComponents}>{parsedData.text}</Streamdown>
      )}

      {parsedData.text && !isLoading && (
        <GenerateForm
          onGenerate={complete}
          isLoading={isLoading}
          error={error || null}
        />
      )}
    </div>
  );
}
