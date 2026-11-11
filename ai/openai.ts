import OpenAI from "openai";
import { env } from "../env.ts";

// OpenRouter exposes an OpenAI-compatible API.
export const openai = new OpenAI({
  apiKey: env.OPENROUTER_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});
