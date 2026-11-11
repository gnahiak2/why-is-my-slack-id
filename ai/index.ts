import type { Part } from "@opencode-ai/sdk/v2";
import { AGENT_NAME, PROJECT_DIR, opencode } from "./opencode.ts";

export type AgentEvent =
  | { type: "thinking"; text: string }
  | { type: "text"; text: string }
  | { type: "done"; report: string };

export async function* processSlackId(
  slackId: string,
  fields: {
    name: any;
    alt?: string | undefined;
    label?: string | undefined;
    value?: string | undefined;
  }[],
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const { client } = opencode;
  const directory = PROJECT_DIR;

  const { data: session } = await client.session.create(
    { directory, title: `slack id ${slackId}` },
    { throwOnError: true },
  );
  const sessionID = session.id;

  // Subscribe before prompting so no events are missed.
  const events = new AbortController();
  const { stream } = await client.event.subscribe(
    { directory },
    { signal: events.signal },
  );

  const onAbort = () => {
    client.session
      .abort({ sessionID, directory })
      .catch((error) => console.error("failed to abort session", error));
  };
  if (signal?.aborted) onAbort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    await client.session.promptAsync(
      {
        sessionID,
        directory,
        agent: AGENT_NAME,
        parts: [
          {
            type: "text",
            text:
              slackId +
              "\n\nInfo about the user:\n" +
              fields
                .map(
                  (f) =>
                    `<field><name>${f.name}</name><value>${f.value}</value><alt>${f.alt || ""}</alt></field>`,
                )
                .join(""),
          },
        ],
      },
      { throwOnError: true },
    );

    // Deltas only carry the part id, so remember each part's type.
    const partTypes = new Map<string, Part["type"]>();
    let busy = false;

    for await (const event of stream) {
      if (!("properties" in event)) continue;
      const props = event.properties as { sessionID?: string };
      if (props.sessionID !== sessionID) continue;

      if (event.type === "message.part.updated") {
        partTypes.set(event.properties.part.id, event.properties.part.type);
      } else if (event.type === "message.part.delta") {
        const { partID, field, delta } = event.properties;
        if (field !== "text" || !delta) continue;
        const type = partTypes.get(partID);
        if (type === "reasoning") yield { type: "thinking", text: delta };
        else if (type === "text") yield { type: "text", text: delta };
      } else if (event.type === "session.error") {
        const error = event.properties.error;
        throw new Error(
          `agent run failed: ${error?.name ?? "unknown"} ${JSON.stringify(error?.data ?? {})}`,
        );
      } else if (event.type === "session.status") {
        if (event.properties.status.type === "busy") busy = true;
        else if (event.properties.status.type === "idle" && busy) break;
      } else if (event.type === "session.idle") {
        if (busy) break;
      }
    }

    if (signal?.aborted) return;
    yield { type: "done", report: await finalReport(sessionID, directory) };
  } finally {
    signal?.removeEventListener("abort", onAbort);
    events.abort();
    client.session
      .delete({ sessionID, directory })
      .catch((error) => console.error("failed to delete session", error));
  }
}

// The report is the text of the last assistant message in the session.
async function finalReport(sessionID: string, directory: string) {
  const { data: messages } = await opencode.client.session.messages(
    { sessionID, directory },
    { throwOnError: true },
  );
  const last = messages.findLast((m) => m.info.role === "assistant");
  if (!last) throw new Error("agent run produced no assistant message");
  if (last.info.role === "assistant" && last.info.error) {
    throw new Error(`agent run failed: ${JSON.stringify(last.info.error)}`);
  }
  const report = last.parts
    .filter((p) => p.type === "text" && !p.synthetic && !p.ignored)
    .map((p) => (p as { text: string }).text)
    .join("")
    .trim();
  if (!report) throw new Error("agent run produced an empty report");
  return report;
}
