import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  gateway,
  hasToolCall,
  smoothStream,
  stepCountIs,
  streamText,
  wrapLanguageModel,
} from "ai";
import { Redis } from "@upstash/redis";
import { searchTool } from "./tool";
import { cacheMiddleware, getCacheKey } from "./middleware";

export const maxDuration = 30;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const wrappedModel = wrapLanguageModel({
  model: gateway("openai/gpt-5.1"),
  middleware: [cacheMiddleware],
});

export async function POST(req: Request) {
  try {
    const { prompt }: { prompt?: string } = await req.json();

    if (!prompt) {
      return new Response("No prompt provided", { status: 400 });
    }

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Check if result is cached
        const cacheKey = getCacheKey(prompt);
        const cached = await redis.get(cacheKey);
        const isCached = cached !== null;

        const result = streamText({
          model: wrappedModel,
          system:
            "Role: You generate a full featured engaging, professional Markdown article for this personal website." +
            "Context: Use single tool call to SearchTool to gather the freshest information about the person from the prompt." +
            "Output: When the tool call is finished, provide a final summary of the information you found using Markdown formatting." +
            "Rules: never invent facts; never generate mock information; keep the tone warm, confident and engaging; use Markdown elements; provide a single response—no follow-up suggestions or meta commentary.",
          prompt: prompt,
          tools: {
            searchTool,
          },
          providerOptions: {
            openai: {
              // Set reasoning to minimal (effectively "0")
              reasoningEffort: 'none',
            },
          },
          // Only use stepCountIs(2) when not cached to ensure tool call + final response
          // When cached, the middleware returns the complete response in one go
          ...(isCached ? {} : { stopWhen: stepCountIs(2) }),
          experimental_context: { writer },
          experimental_transform: smoothStream({
            delayInMs: 20, // optional: defaults to 10ms
            chunking: "line", // optional: defaults to 'word'
          }),
        });
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Generation error:", error);
    return new Response("Error generating content", { status: 500 });
  }
}
