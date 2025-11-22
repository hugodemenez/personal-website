import { streamText, tool } from "ai";
import { z } from "zod";
import { getWriter } from "./context";

export const searchTool = tool({
  description: "Use this to search for information about a given person.",
  inputSchema: z.object({
    name: z.string().describe("The name of the person to search for"),
  }),
  async *execute(params, executionOptions) {
    yield {
      status: "searching" as const,
      text: `Searching for information about ${params.name}...`,
    };
    const writer = getWriter(executionOptions);
    // This is a very expensive API call - 2s response time
    // The goal is to provide user feedback while the expensive API call is running
    const stream = streamText({
      model: "xai/grok-4-fast-non-reasoning",
      system:
        "Context: You are a helpful assistant that finds the latest information about the person and their projects." +
        "Rules: strictly search about the person mentioned in the prompt." +
        "Output: List of information about the person and their projects." +
        "If you don't find any information about the person mentioned in the prompt, say that you couldn't find any information about them.",
      prompt: `Find the latest information about ${params.name} and their projects.`,
      providerOptions: {
        xai: {
          searchParameters: {
            mode: "on", // 'auto', 'on', or 'off'
            returnCitations: true,
            maxSearchResults: 20,
            sources: [
              {
                type: "web",
                safeSearch: true,
              },
            ],
          },
        },
      },
    });

    const perplexityStream = streamText({
      model: "perplexity/sonar",
      system:
        "Context: You are a helpful assistant that finds the latest information about the person and their projects." +
        "Rules: strictly search about the person mentioned in the prompt." +
        "Output: List of information about the person and their projects." +
        "If you don't find any information about the person mentioned in the prompt, say that you couldn't find any information about them.",
      prompt: `Find the latest information about ${params.name} and their projects.`,
    });

    // Stream perplexity results with custom ID
    const perplexityId = "perplexity-search";
    for await (const chunk of perplexityStream.textStream) {
      writer.write({ type: "text-delta", delta: chunk, id: perplexityId });
    }

    // Stream xai/grok results with custom ID
    const xaiId = "xai-search";
    for await (const chunk of stream.textStream) {
      writer.write({ type: "text-delta", delta: chunk, id: xaiId });
    }

    const sources = await stream.sources;
    const perplexitySources = await perplexityStream.sources;
    console.log("Sources:", sources.length);
    console.log("Perplexity Sources:", perplexitySources.length);
    yield {
      status: "finished" as const,
      sources: [...sources, ...perplexitySources],
    };
  },
});
