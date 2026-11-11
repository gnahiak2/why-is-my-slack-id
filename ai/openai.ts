import OpenAI from "openai";
import { env } from "../env.ts";

// Command Code exposes an OpenAI-compatible API.
export const openai = new OpenAI({
  apiKey: env.CMD_API_KEY,
  baseURL: "https://api.commandcode.ai/provider/v1",
});
