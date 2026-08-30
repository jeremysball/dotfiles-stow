/**
 * Registers the xiaomi-token-plan (Xiaomi MiMo Token Plan subscription) provider
 * for pi, mirroring the opencode.jsonc provider config for the same
 * account/endpoint. Native Anthropic-format API.
 *
 * NOTE on baseUrl and /v1: opencode.jsonc uses
 * "https://token-plan-sgp.xiaomimimo.com/anthropic/v1" because
 * @ai-sdk/anthropic only adds "/messages" to whatever baseURL it is given,
 * not "/v1/messages". pi's anthropic-messages api uses the official Anthropic
 * SDK client instead, which already appends "/v1/messages" itself (confirmed
 * against pi's own built-in "anthropic" provider, whose baseUrl is the bare
 * "https://api.anthropic.com", no /v1) — so baseUrl here is the same host
 * WITHOUT the "/v1". Adding it would 404 every request. The two spellings
 * differing is correct, not drift.
 *
 * The host was previously read from a secret-management env var. It is a
 * public endpoint, not a secret, and putting it inline matches how the
 * alibaba and nanogpt providers spell theirs — and removes a var that had to
 * be kept in sync across pass, the secrets file and two repos.
 */
export default function (pi) {
  pi.registerProvider("xiaomi-token-plan", {
    name: "Xiaomi MiMo (Token Plan)",
    baseUrl: "https://token-plan-sgp.xiaomimimo.com/anthropic",
    apiKey: "$XIAOMI_TOKEN_PLAN_SGP_API_KEY",
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
