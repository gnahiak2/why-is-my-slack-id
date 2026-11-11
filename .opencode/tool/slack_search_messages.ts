import { tool } from "@opencode-ai/plugin";
import { searchSlackMessages } from "../../ai/slack.ts";

export default tool({
  description:
    "Search Slack messages across the workspace. Supports Slack search query syntax: " +
    "'from:<user_id>', 'in:<channel>', 'after:<date>', 'before:<date>', 'on:<date>', " +
    "and text terms. Combine filters with spaces.",
  args: {
    query: tool.schema.string(),
    count: tool.schema.number().optional().describe("Results per page (1-100, default 20)"),
    page: tool.schema.number().optional().describe("Page number (default 1)"),
    sort: tool.schema.enum(["timestamp", "score"]).optional(),
    sort_dir: tool.schema.enum(["asc", "desc"]).optional(),
  },
  async execute(args) {
    return JSON.stringify(await searchSlackMessages(args));
  },
});
