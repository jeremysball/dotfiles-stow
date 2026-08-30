/**
 * Registers the xiaomi-tknplan (Xiaomi MiMo Token Plan subscription) provider
 * for pi, mirroring the opencode.jsonc provider config for the same
 * account/endpoint. Native Anthropic-format API.
 *
 * NOTE on baseUrl and /v1: opencode.jsonc appends "/v1" to
 * {env:XIAOMI_TKN_PLAN_URL} because @ai-sdk/anthropic only adds "/messages"
 * to whatever baseURL it's given, not "/v1/messages". pi's anthropic-messages
 * api uses the official Anthropic SDK client instead, which already appends
 * "/v1/messages" itself (confirmed against pi's own built-in "anthropic"
 * provider, whose baseUrl is the bare "https://api.anthropic.com", no /v1) —
 * so baseUrl here must stay the raw XIAOMI_TKN_PLAN_URL value, unmodified.
 * Appending "/v1" here would 404 every request.
 */
export default function (pi) {
  pi.registerProvider("xiaomi-tknplan", {
    name: "Xiaomi MiMo (Token Plan)",
    baseUrl: process.env.XIAOMI_TKN_PLAN_URL,
    apiKey: "$XIAOMI_TKN_PLAN_API_KEY",
    api: "anthropic-messages",
    models: [
      {
        id: "mimo-v2.5",
        name: "MiMo V2.5",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1050000,
        maxTokens: 131072,
      },
      {
        id: "mimo-v2.5-pro",
        name: "MiMo V2.5 Pro",
        reasoning: true,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1050000,
        maxTokens: 131072,
      },
    ],
  });
}
