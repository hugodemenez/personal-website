import { processMarkdown } from "@/lib/markdown";
import {
  type LanguageModelV2Middleware,
  type LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import { Redis } from "@upstash/redis";
import { simulateReadableStream } from "ai";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const cache = new Map<string, any>();

export const cacheMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const cacheKey = JSON.stringify(params);

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const result = await doGenerate();

    cache.set(cacheKey, result);

    return result;
  },

  wrapStream: async ({ doStream, params }) => {
    // Extract just the user prompt text for caching to ensure identical prompts are cached together,
    // regardless of tool call details.
    // The "prompt" is in params.prompt[1].content[0].text for this API structure.
    let userPrompt = "";
    try {
      const promptArr = Array.isArray(params.prompt) ? params.prompt : [];
      if (
        promptArr.length > 1 &&
        promptArr[1].content &&
        Array.isArray(promptArr[1].content) &&
        promptArr[1].content.length > 0 &&
        promptArr[1].content[0].type === "text"
      ) {
        userPrompt = promptArr[1].content[0].text.trim();
      } else {
        userPrompt = JSON.stringify(params.prompt); // fallback
      }
    } catch {
      userPrompt = JSON.stringify(params.prompt);
    }
    const cacheKey = JSON.stringify({ prompt: userPrompt });
    console.log("Searching for cache key:", cacheKey);
  
    // Check if the result is in the cache
    const cached = await redis.get(cacheKey);
  
    // If cached, return a simulated ReadableStream that yields the cached result
    if (cached !== null) {
      console.log("Found cached result");
      // Format the timestamps in the cached response
      const formattedChunks = (cached as LanguageModelV2StreamPart[]).map(
        (p) => {
          if (p.type === "response-metadata" && p.timestamp) {
            return { ...p, timestamp: new Date(p.timestamp) };
          } else return p;
        }
      );
      return {
        stream: simulateReadableStream({
          initialDelayInMs: 0,
          chunkDelayInMs: 10,
          chunks: formattedChunks,
        }),
      };
    }
  
    console.log("Not cached, proceeding...");
    // If not cached, proceed with streaming
    const { stream, ...rest } = await doStream();
  
    const fullResponse: LanguageModelV2StreamPart[] = [];
    let isCompleteResponse = false;
  
    const transformStream = new TransformStream<
      LanguageModelV2StreamPart,
      LanguageModelV2StreamPart
    >({
      transform(chunk, controller) {
        fullResponse.push(chunk);
        
        // Check if this is a finish event with a complete response
        if (chunk.type === 'finish') {
          // Only mark as complete if it's a full response, not just tool calls
          if (chunk.finishReason === 'stop' || chunk.finishReason === 'length') {
            isCompleteResponse = true;
          }
        }
        
        controller.enqueue(chunk);
      },
      flush() {
        console.log('Full response:', fullResponse);
        // Only cache if we have a complete response (not just tool calls)
        if (isCompleteResponse) {
          console.log('Caching complete response');
          redis.set(cacheKey, fullResponse, { ex: 60 * 60 * 24 * 7 }); // 1 week
        } else {
          console.log('Not caching incomplete response (tool calls only)');
        }
      },
    });
  
    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};
