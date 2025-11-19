import { stepCountIs, streamText } from "ai";
import { searchTool } from "./tool";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { prompt }: { prompt?: string } = await req.json();

    const result = streamText({
      model: "openai/gpt-5-mini",
      system: `You are a personal introduction message generator for a personal website.
      You have ONE SHOT to generate the introduction message (it's not a conversation).
    Using SearchTool, you will get latest information about the person mentioned in the prompt.
    Generate a summary of the information you found about this person.
    Keep it concise, engaging, and professional.
    You must use beautiful markdown formatting for the blog website.
    You can put X/Twitter links in the result as it will be displayed in the blog website using a custom component.
    `,
      prompt: prompt || "Generate a summary of the information you found.",
      tools: {
        searchTool,
      },
      stopWhen: stepCountIs(2),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Generation error:", error);
    return new Response("Error generating content", { status: 500 });
  }
}
