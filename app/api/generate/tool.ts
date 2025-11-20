import { streamText, tool } from "ai";
import { z } from "zod";
import { getWriter } from "./context";

export const searchTool = tool({
  description:
    "Use this to search for information about a given person.",
  inputSchema: z.object({
    name: z
      .string()
      .describe(
        "The name of the person to search for"
      ),
  }),
  async *execute(params, executionOptions) {
    yield{
      status: "searching" as const,
      text: `Searching for information about ${params.name}...`,
    };
    const writer = getWriter(executionOptions);
    // This is a very expensive API call - 2s response time
    // The goal is to provide user feedback while the expensive API call is running
    const stream = streamText({
      model: "xai/grok-4-fast-non-reasoning",
      system: "Looking at github, linkedin, X posts and substack, find the latest information about the person and their projects."+
        "Make sure to strictly search about the person mentioned in the prompt."+
        "If you don't find any information about the person mentioned in the prompt, say that you couldn't find any information about them."+
        "Try to find at least one Twitter/X content (tweets, threads, etc.) and add the link to the post to the result.",
      prompt: `Find the latest information about ${params.name} and their projects.`,
      providerOptions: {
        xai: {
          searchParameters: {
            mode: 'auto', // 'auto', 'on', or 'off'
            returnCitations: true,
            maxSearchResults: 5,
          },
        },
      },
    });

    const sources = await stream.sources;

    yield{
      status: "finished" as const,
      sources: sources,
    }
    return stream.toUIMessageStream();
  },
});
