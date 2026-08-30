/**
 * Registers the cheapestinference provider (paid, time-gated 20:00-04:00
 * local, see /home/jeremy/.claude/skills/choosing-a-model/working-report.md)
 * for pi, mirroring the opencode.jsonc provider config for the same
 * account/endpoint. Anthropic-format API, native "anthropic-messages"
 * support in pi — no custom streamSimple needed.
 */
export default function (pi) {
  pi.registerProvider("cheapestinference", {
    name: "CheapestInference",
    baseUrl: "https://api.cheapestinference.com/anthropic",
    apiKey: "$CHEAPESTINFERENCE_API_KEY",
    api: "anthropic-messages",
    models: [
      {
        id: "glm-5.2",
        name: "GLM 5.2",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 202752,
        maxTokens: 131072,
      },
      {
        id: "kimi-k2.6",
        name: "Kimi K2.6",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 262144,
        maxTokens: 65536,
      },
      {
        id: "kimi-k2.7",
        name: "Kimi K2.7",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 262144,
        maxTokens: 262144,
      },
      {
        id: "minimax-m3",
        name: "MiniMax M3",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1000000,
        maxTokens: 131072,
      },
    ],
  });
}
