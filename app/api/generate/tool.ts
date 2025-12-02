import { gateway, streamText, tool, wrapLanguageModel } from "ai";
import { z } from "zod";
import { cacheMiddleware } from "./middleware";
import { getWriter } from "./context";

const cachedXaiModel = wrapLanguageModel({
  model: gateway("xai/grok-4-fast-non-reasoning"),
  middleware: [cacheMiddleware],
});

export const searchTool = tool({
  description: "Use this to search for information about a given person.",
  inputSchema: z.object({
    name: z.string().describe("The name of the person to search for"),
    pages: z.array(z.string()).describe("The pages to prioritize when searching for the person").optional(),
  }),
  async execute({ name, pages }, executionOptions) {
    const writer = getWriter(executionOptions);
    // This is a very expensive API call - 2s response time
    // The goal is to provide user feedback while the expensive API call is running
    const stream = streamText({
      model: cachedXaiModel,
      system:
        "Context: You are a helpful assistant that finds the latest information about the person and their projects." +
        "Rules: strictly search about the person mentioned in the prompt." +
        pages && `Use these pages as primary sources when searching:\n${pages?.join("\n")}`+
        "Output: List of information about the person and their projects." +
        "If you don't find any information about the person mentioned in the prompt, say that you couldn't find any information about them.",
      prompt: `${name}`,
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
              }
            ],
          },
        },
      },
    });

    writer.merge(stream.toUIMessageStream({ sendSources: true }));
    const result = await stream.output;

    // We should cache sources as it is not part of middleware cache
    const sources = await stream.sources;
    return { result, sources };
  },
});
