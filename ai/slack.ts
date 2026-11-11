import { WebClient } from "@slack/web-api";

/**
 * Slack WebClient backed by the user (xoxp) token. search.messages needs a user
 * token — the Bolt app's own client uses the bot token (xoxb), which cannot
 * call search.messages — so we use a separate client here.
 *
 * This module runs inside the opencode server process (loaded by
 * .opencode/tool/slack_search_messages.ts), which inherits our env.
 */
let client: WebClient | undefined;

export type SlackSearchArgs = {
  query: string;
  count?: number;
  page?: number;
  sort?: "timestamp" | "score";
  sort_dir?: "asc" | "desc";
};

/**
 * Search Slack messages via the WebClient (the same SDK @slack/bolt uses).
 * https://api.slack.com/methods/search.messages
 */
export async function searchSlackMessages(args: SlackSearchArgs) {
  const token = process.env.SLACK_USER_TOKEN;
  if (!token) throw new Error("SLACK_USER_TOKEN is not set");
  client ??= new WebClient(token);

  const query = String(args.query ?? "");
  const body: any = await client.search.messages({
    query,
    count: Math.min(Math.max(Number(args.count ?? 20), 1), 100),
    page: Math.max(Number(args.page ?? 1), 1),
    sort: args.sort === "score" ? "score" : "timestamp",
    sort_dir: args.sort_dir === "asc" ? "asc" : "desc",
  });

  const matches = (body.messages?.matches ?? []).map((m: any) => ({
    text: m.text,
    user: m.user,
    username: m.username,
    ts: m.ts,
    permalink: m.permalink,
    channel: m.channel
      ? {
          id: m.channel.id,
          name: m.channel.name,
          is_im: m.channel.is_im,
          is_mpim: m.channel.is_mpim,
          is_private: m.channel.is_private,
        }
      : null,
  }));

  return {
    ok: Boolean(body.ok),
    error: body.ok ? null : (body.error ?? "unknown_slack_error"),
    query,
    total: body.messages?.total ?? matches.length,
    paging: body.messages?.paging ?? null,
    matches,
  };
}
