import { openai } from "./openai.ts";
import { statusUpdateParser as statusUpdateParserPrompt } from "./prompts.ts";

export default async function parseStatusUpdate(message: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "deepseek/deepseek-v4.1-flash",
      messages: [
        {
          role: "system",
          content: statusUpdateParserPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return response.choices[0]?.message.content?.trim().substring(0, 50);
  } catch {
    return message.substring(0, 50);
  }
}
