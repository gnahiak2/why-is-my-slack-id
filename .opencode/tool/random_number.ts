import { tool } from "@opencode-ai/plugin";

export default tool({
  description: "Generate a random number between 0 and 1",
  args: {},
  async execute() {
    return String(Math.random());
  },
});
