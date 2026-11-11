import { join } from "node:path";
import { createOpencode } from "@opencode-ai/sdk/v2";
import { agent as agentPrompt } from "./prompts.ts";
import { env } from "../env.ts";

export const AGENT_NAME = "slackid";
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
    model: "commandcode/deepseek/deepseek-v4.1-flash",
    small_model: "commandcode/deepseek/deepseek-v4.1-flash",
    enabled_providers: ["commandcode"],
    provider: {
      commandcode: { options: { apiKey: env.CMD_API_KEY } },
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
