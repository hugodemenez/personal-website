import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  gateway,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessage,
  wrapLanguageModel,
} from "ai";
import { Redis } from "@upstash/redis";
import { searchTool } from "./tool";
import { cacheMiddleware } from "./middleware";
import { type LanguageModelV3StreamPart } from "@ai-sdk/provider";
export const maxDuration = 30;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const cachedOpenaiModel = wrapLanguageModel({
  model: gateway("openai/gpt-4.1-nano"),
  middleware: [cacheMiddleware],
});

export async function POST(req: Request) {
  try {
    const { messages, pages } = (await req.json()) as {
      messages?: UIMessage[];
      pages?: string[];
    };

    if (!messages || messages.length === 0) {
      return new Response("No messages provided", { status: 400 });
    }

    // Safely extract text content from the last message parts
    const lastMessage = messages[messages.length - 1];
    const prompt =
      lastMessage.parts
        ?.map((part) =>
          typeof (part as { text?: unknown }).text === "string"
            ? (part as { text: string }).text
            : ""
        )
        .join("") ?? "";

    // Be careful, first tool call is considered as a final stream.
    // So we need to check if it is a tool call or a text stream.
    const cachedSearch = (await redis.get(
      `${prompt}-search`
    )) as LanguageModelV3StreamPart[];
    const cachedFinal = (await redis.get(
      `${prompt}-final`
    )) as LanguageModelV3StreamPart[];

    const isCached = cachedSearch !== null && cachedFinal !== null;
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: cachedOpenaiModel,
          messages: convertToModelMessages(messages),
          system:
            "Role: You generate a full featured engaging, professional Markdown article for this personal website around 100 words long." +
            "Context: Use single tool call to SearchTool to gather the freshest information about the person from the prompt." +
            pages ? `Input: The pages provided by the user to prioritize when searching for the person: ${pages?.join("\n")}` : "" +
            "Output: When the tool call is finished, provide a final summary of the information you found using Markdown formatting." +
            "Rules:"+
            "embed links in the markdown format like this: [text](https://example.com)"+
            "never invent facts; never generate mock information; keep the tone warm, confident and engaging; use Markdown elements; provide a single response—no follow-up suggestions or meta commentary.",
          maxOutputTokens: 500,
          // Only use stepCountIs(2) when not cached to ensure tool call + final response
          // When cached, the middleware returns the complete response in one go
          ...(isCached
            ? {}
            : {
                stopWhen: stepCountIs(2),
                tools: { searchTool },
              }),
          experimental_context: {
            writer,
          },
          experimental_transform: smoothStream({
            delayInMs: 10,
            chunking: "line",
          }),
        });
        writer.merge(result.toUIMessageStream({ sendSources: true }));
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Generation error:", error);
    return new Response("Error generating content", { status: 500 });
  }
}
