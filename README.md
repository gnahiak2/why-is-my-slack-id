# Why is my Slack ID

A Slack bot that explains why a user has a specific Slack ID, using an AI agent to make far-fetched conclusions based on profile fields and information it can find about the user online.

## Stack

- Bun
- opencode SDK (agent: DeepSeek V4.1 Flash via Command Code)
- OpenAI SDK (status updates via Command Code)
- Typescript
- Slack Bolt
- T3 Env + Zod

## Testing

If you're in the [Hack Club Slack](https://slack.hackclub.com/) you can join the [#why-is-my-slack-id](https://hackclub.enterprise.slack.com/archives/C0AF8SA49J8) channel and send a message. Wait like two minutes for a response explaining your Slack ID.

## Running

1. Populate env (see `.env.example`)
2. In the Slack app settings, turn on **Interactivity & Shortcuts** (needed for the Delete button; with Socket Mode no request URL is required)
3. `docker compose up -d`, or locally: `bun install && bun start`

The agent runs on a local `opencode serve` process started by the bot. Its custom tools live in `.opencode/tool/`.
