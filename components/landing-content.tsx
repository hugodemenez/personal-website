"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useEffect, useRef, Suspense, useState, useMemo } from "react";
import { mdxComponents } from "./mdx-components-list";
import { SourcesAccordion } from "./sources-accordion";
import { GenerateForm } from "./generate-form";
import { Streamdown } from "streamdown";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

interface Source {
  type: string;
  sourceType: string;
  id: string;
  url: string;
}

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    !isAtBottom && (
      <button
        className="absolute i-ph-arrow-circle-down-fill text-4xl rounded-lg left-[50%] translate-x-[-50%] bottom-4"
        onClick={() => scrollToBottom()}
      />
    )
  );
}
function LandingContentInner() {
  const [indexOfSearchResults, setIndexOfSearchResults] = useState<number>(-1);
  // Has to be wrapped in a Suspense to avoid hydration errors because it calls APIs.
  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/generate",
    }),
    onError: (err: Error) => console.error("Chat error:", err),
  });

  const hasStartedRef = useRef(false);

  // Start the chat when the component mounts
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      const hugoPrompt = "Hugo Demenez";
      sendMessage({
        role: "user",
        parts: [{ type: "text", text: hugoPrompt }],
      });
    }
  }, [sendMessage]);

  // Use hook error if available
  const displayError = error?.message || null;
  const isLoading = status === "streaming" || status === "submitted";
  // Extract sources from all message parts and deduplicate by URL
  const sources = useMemo(() => {
    const seenUrls = new Set<string>();
    const uniqueSources: Source[] = [];

    messages.forEach((message) => {
      message.parts?.forEach((part) => {
        if (
          part.type === "source-url" &&
          "url" in part &&
          typeof part.url === "string"
        ) {
          const url = part.url.trim().replace(/\/$/, "");
          // Normalize URL for comparison: lowercase
          const normalizedUrl = url.toLowerCase();

          // Only add if we haven't seen this URL before
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);

            // Use id if available, otherwise use URL as ID
            const sourceId =
              (part as any).id && typeof (part as any).id === "string"
                ? (part as any).id
                : url;

            uniqueSources.push({
              type: part.type,
              sourceType: "url",
              id: sourceId,
              url: url, // Keep original URL format for display
            });
          }
        }
      });
    });

    return uniqueSources;
  }, [messages]);

  // Find all text parts and identify which is first vs last
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    const textParts = lastMessage.parts?.findIndex(
      (part) => part.type === "text"
    );
    if (textParts !== undefined) {
      setIndexOfSearchResults(textParts);
    }
  }, [messages]);

  return (
    <div className="mt-8">
      <GenerateForm
        onGenerate={(prompt, pages) => {
          setMessages([]);
          sendMessage(
            {
              role: "user",
              parts: [{ type: "text", text: prompt }],
            },
            {
              body: {
                pages,
              },
            }
          );
        }}
        isLoading={isLoading}
        error={displayError ? new Error(displayError) : null}
      />
      <div className="border-b border-border my-8 mx-auto w-full"></div>
      <div className="space-y-8">
        {messages.map((message: UIMessage) => {
          switch (message.role) {
            case "user":
              return (
                <div
                  key={message.id}
                >
                  <h1 className={`text-2xl font-bold ${isLoading ? "animate-pulse" : ""}`}>
                  {message.parts?.[0]?.type === "text" ? `${isLoading ? "Crafting" : "Here is"} a page for ${message.parts?.[0]?.text}` : "Generating..."}
                  </h1>
                </div>
              );
            case "assistant":
              return message.parts?.map((part, index) => {
                switch (part.type) {
                  case "text":
                    // First text part is the intermediate search results (shown in special container)
                    if (index === indexOfSearchResults) {
                      return (
                        <div
                          key={`${message.id}-${index}`}
                          className="p-4 bg-surface border border-border rounded-lg"
                        >
                          {/* Fixed height conversation container with auto-scroll */}
                          <StickToBottom
                            className="h-[20vh] relative"
                            resize="smooth"
                            initial="smooth"
                          >
                            <StickToBottom.Content className="flex flex-col gap-4">
                              <div className="prose prose-stone dark:prose-invert max-w-none text-sm">
                                <Streamdown
                                  components={mdxComponents}
                                  parseIncompleteMarkdown={true}
                                >
                                  {part.text}
                                </Streamdown>
                                <SourcesAccordion sources={sources} />
                              </div>
                            </StickToBottom.Content>
                            <ScrollToBottom />
                          </StickToBottom>
                        </div>
                      );
                    } else {
                      // Last text part (or only text part) is the final summary
                      return (
                        <div
                          key={`${message.id}-${index}`}
                          className="prose prose-stone dark:prose-invert max-w-none"
                        >
                          <Streamdown
                            components={mdxComponents}
                            parseIncompleteMarkdown={true}
                          >
                            {part.text}
                          </Streamdown>
                        </div>
                      );
                    }
                  default:
                    return null;
                }
              });
            default:
              return null;
          }
        })}
      </div>
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
    </div>
  );
}

export function LandingContent() {
  return (
    <Suspense>
      <LandingContentInner />
    </Suspense>
  );
}
