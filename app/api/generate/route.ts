import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  gateway,
  hasToolCall,
  smoothStream,
  stepCountIs,
  streamText,
  wrapLanguageModel,
  wrapProvider,
} from "ai";
import { searchTool } from "./tool";
import { cacheMiddleware } from "./middleware";

export const maxDuration = 30;

const wrappedModel = wrapLanguageModel({
  model: gateway("openai/gpt-4.1-nano"),
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
        const result = streamText({
          model: wrappedModel,
          system: "Role: You generate a full featured engaging, professional Markdown article for this personal website."+
          "Context: Use single tool call to SearchTool to gather the freshest information about the person from the prompt."+
          "Output: When the tool call is finished, provide a final summary of the information you found using Markdown formatting."+
          "Rules: never invent facts; keep the tone warm, confident and engaging; use Markdown elements; include any X/Twitter links you discover using <tweet>id<tweet>; provide a single response—no follow-up suggestions or meta commentary.",
          prompt: prompt,
          tools: {
            searchTool,
          },
          stopWhen: stepCountIs(2),
          experimental_context: { writer },
          experimental_transform: smoothStream({
            delayInMs: 20, // optional: defaults to 10ms
            chunking: "line", // optional: defaults to 'word'
          }),
          onFinish: (result) => {
          console.log(result.text);
          },
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
