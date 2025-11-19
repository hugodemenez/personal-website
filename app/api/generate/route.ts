import { stepCountIs, streamText } from "ai";
import { searchTool } from "./tool";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { prompt }: { prompt?: string } = await req.json();

    const result = streamText({
      model: "google/gemini-2.0-flash-lite",
      system: `

        You are a personal introduction message generator for a personal website.
        Using SearchTool, you will get latest information about the person mentioned in the prompt.
        Generate a summary of the information you found about this person.
        
        FOLLOW THESE RULES:
        1. DO NOT MAKE UP INFORMATION.
        2. MAKE IT ENGAGING AND PROFESSIONAL.
        USE BEAUTIFUL MARKDOWN FORMATTING FOR THE BLOG WEBSITE SO IT LOOKS GOOD ON THE WEBSITE.
        4. CAN USE TABLES, LISTS, IMAGES, CODE BLOCKS, ETC.
        5. IF FOUND X/Twitter LINKS IN THE RESULT, ADD THEM AS IT WILL BE DISPLAYED IN THE BLOG WEBSITE USING A CUSTOM COMPONENT.

        YOU HAVE ONE SHOT TO GENERATE THE INTRODUCTION MESSAGE (IT'S NOT A CONVERSATION).
        DO NOT PUT SUGGESTIONS OR NOTES AT THE END OF THE MESSAGE.
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
