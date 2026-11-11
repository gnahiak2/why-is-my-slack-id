import { join } from "node:path";
import { createOpencode } from "@opencode-ai/sdk/v2";
import { agent as agentPrompt } from "./prompts.ts";
import { env } from "../env.ts";

export const AGENT_NAME = "slackid";
const PROVIDER_ID = "command-code";
const MODEL_ID = "deepseek/deepseek-v4.1-flash";
export const PROJECT_DIR = join(import.meta.dir, "..");

// The SDK spawns `opencode serve` from PATH; use the binary from the
// opencode-ai dependency so we don't need a global install.
process.env.PATH = `${join(PROJECT_DIR, "node_modules", ".bin")}:${process.env.PATH ?? ""}`;
// Enables the built-in websearch tool (Exa, no API key needed).
process.env.OPENCODE_ENABLE_EXA = "1";

/**
 * A single opencode server shared by every run. Each analysis gets its own
 * session. Custom tools live in .opencode/tool/ and run inside this server.
 */
export const opencode = await createOpencode({
  port: 0,
  timeout: 30_000,
  config: {
    model: `${PROVIDER_ID}/${MODEL_ID}`,
    small_model: `${PROVIDER_ID}/${MODEL_ID}`,
    enabled_providers: [PROVIDER_ID],
    provider: {
      // Command Code as a custom OpenAI-compatible provider, so we don't
      // depend on opencode's built-in provider catalog.
      [PROVIDER_ID]: {
        name: "Command Code",
        npm: "@ai-sdk/openai-compatible",
        options: {
          baseURL: "https://api.commandcode.ai/provider/v1",
          apiKey: env.CMD_API_KEY,
        },
        models: {
          [MODEL_ID]: {
            name: "DeepSeek V4.1 Flash",
            reasoning: true,
            tool_call: true,
            temperature: true,
            limit: { context: 1_000_000, output: 384_000 },
          },
        },
      },
    },
    autoupdate: false,
    share: "disabled",
    snapshot: false,
    lsp: false,
    formatter: false,
    default_agent: AGENT_NAME,
    agent: {
      [AGENT_NAME]: {
        mode: "primary",
        description: "Explains why a Slack user has their Slack ID",
        prompt: agentPrompt,
        // Nothing can answer permission prompts, and Slack messages / web
        // pages are untrusted input, so only allow the research tools.
        permission: {
          "*": "deny",
          webfetch: "allow",
          websearch: "allow",
          slack_search_messages: "allow",
          random_number: "allow",
        },
      },
    },
  },
});

let closed = false;
function shutdown() {
  if (closed) return;
  closed = true;
  opencode.server.close();
}
process.on("exit", shutdown);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    shutdown();
    process.exit(0);
  });
}
