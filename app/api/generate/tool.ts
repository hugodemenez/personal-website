import { createCached } from "@ai-sdk-tools/cache";
import { generateText, streamText, tool } from "ai";
import { z } from "zod";

const expensiveSearchTool = tool({
  description: "Get latest information about a person. Use this to search for information about anyone mentioned in the prompt.",
  inputSchema: z.object({
    personInfo: z.string().describe("The name, location, or other identifying information about the person to search for"),
    twitterHandle: z.string().optional(),
    githubHandle: z.string().optional(),
    linkedinHandle: z.string().optional(),
    substackHandle: z.string().optional(),
  }),
  execute: async ({ personInfo, twitterHandle, githubHandle, linkedinHandle, substackHandle }) => {
    console.log("Executing searchTool for:", personInfo);
    
    const handles = [];
    if (twitterHandle) handles.push(`Twitter/X: ${twitterHandle}`);
    if (githubHandle) handles.push(`GitHub: ${githubHandle}`);
    if (linkedinHandle) handles.push(`LinkedIn: ${linkedinHandle}`);
    if (substackHandle) handles.push(`Substack: ${substackHandle}`);
    
    const handleInfo = handles.length > 0 ? `\nKnown handles: ${handles.join(', ')}` : '';
    
    // Expensive API call - 2s response time
    const result = await generateText({
      model: "perplexity/sonar",
      system: `
      Looking at github, linkedin, x posts and substack, find the latest information about the person and their projects.
      Try to find Twitter/X content (tweets, threads, etc.) and add the link to the post to the result.
     `,
      prompt: `Who is ${personInfo} and what are they building or working on lately? ${handleInfo}`,
    });

    return {text: result.text, sources: result.sources};
  },
});

// LRU cache (zero config)
const cached = createCached({
    ttl: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
});

export const searchTool = cached(expensiveSearchTool);
